import { and, asc, count, eq, exists, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { sheetLinks, submissions } from '@/db/schema';
import { mergeColumns, sheetColumns } from '@/lib/sheet-columns';
import { getInstrument } from '@/server/instruments';
import { sheetsApi, type SheetsApi } from '@/server/google/sheets-api';
import { GoogleError } from '@/server/google/token';

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;

export const SHEET_TAB = 'Respuestas';
const BATCH = 500;
const ROUNDS = 10;
// En milisegundos: el valor vuelve como Date de JS y sirve de identidad del lease (sin perder microsegundos).
const LEASE = sql`date_trunc('milliseconds', now() + interval '2 minutes')`;
const range = (a1: string) => `'${SHEET_TAB}'!${a1}`;

export const ERROR_TEXT: Record<GoogleError['reason'], string> = {
  sin_permiso: 'El sistema perdió el permiso de edición en la hoja.',
  no_encontrada: 'La hoja ya no existe o se borró la pestaña Respuestas.',
  limite: 'Google limitó los envíos por un momento.',
  google: 'Google no respondió.',
};

type SyncResult = { status: 'ok' | 'skipped' | 'error' | 'unlinked'; sent: number; pending: number };

// Pendiente: aún no enviado a la hoja vinculada. Sin vínculo no hay pendientes.
const pending = (instrumentId: string) => and(
  eq(submissions.instrumentId, instrumentId),
  isNull(submissions.sheetSyncedAt),
  sql`exists (select 1 from ${sheetLinks} where ${sheetLinks.instrumentId} = ${instrumentId})`,
);

export async function pendingCount(db: Db, instrumentId: string): Promise<number> {
  const [{ n }] = await q(db).select({ n: count() }).from(submissions).where(pending(instrumentId));
  return n;
}

export async function syncInstrument(db: Db, instrumentId: string, api?: SheetsApi): Promise<SyncResult> {
  // Lease: un solo UPDATE condicional, atómico en Postgres; solo una sincronización por instrumento a la vez.
  const [link] = await q(db).update(sheetLinks).set({ leaseUntil: LEASE })
    .where(and(eq(sheetLinks.instrumentId, instrumentId), or(isNull(sheetLinks.leaseUntil), lt(sheetLinks.leaseUntil, sql`now()`))))
    .returning();
  if (!link) {
    const [exists] = await q(db).select({ id: sheetLinks.instrumentId }).from(sheetLinks).where(eq(sheetLinks.instrumentId, instrumentId));
    return exists ? { status: 'skipped', sent: 0, pending: await pendingCount(db, instrumentId) } : { status: 'unlinked', sent: 0, pending: 0 };
  }

  let sent = 0;
  let lease = link.leaseUntil!;
  const ours = () => and(eq(sheetLinks.instrumentId, instrumentId), eq(sheetLinks.leaseUntil, lease));
  try {
    const sheets = api ?? sheetsApi({ kind: 'oauth', refreshTokenEnc: link.refreshTokenEnc });
    const cols = sheetColumns(await getInstrument(db, instrumentId)); // borrador: preguntas nuevas aparecen como columnas
    const { layout, byKey } = mergeColumns(link.columns, cols);
    // Una pestaña nueva tiene 26 columnas; escribir más allá falla, así que se ensancha antes.
    const tab = (await sheets.meta(link.spreadsheetId)).sheets.find((t) => t.title === SHEET_TAB);
    if (!tab) throw new GoogleError('Falta la pestaña Respuestas.', 404, 'no_encontrada');
    if (layout.length > tab.columnCount) {
      await sheets.batchUpdate(link.spreadsheetId, [{ appendDimension: { sheetId: tab.sheetId, dimension: 'COLUMNS', length: layout.length - tab.columnCount } }]);
    }
    for (let round = 0; round < ROUNDS; round++) {
      // Renueva el lease solo si sigue siendo nuestro; si otro lo tomó (venció a mitad de camino), se detiene sin duplicar.
      const [renewed] = await q(db).update(sheetLinks).set({ leaseUntil: LEASE }).where(ours()).returning({ until: sheetLinks.leaseUntil });
      if (!renewed) return { status: 'skipped', sent, pending: await pendingCount(db, instrumentId) };
      lease = renewed.until!;
      const startedAt = new Date();
      const batch = await q(db).select().from(submissions).where(pending(instrumentId))
        .orderBy(asc(submissions.completedAt)).limit(BATCH);
      const ids = await sheets.readColumn(link.spreadsheetId, range('A:A'));
      const rowOf = new Map(ids.map((v, i) => [v, i + 1]));
      const data: { range: string; values: (string | number)[][] }[] = [{ range: range('A1'), values: [layout.map((c) => c.header)] }];
      const fresh: (string | number)[][] = [];
      for (const s of batch) {
        const values = layout.map((c) => byKey.get(c.key)?.value(s) ?? '');
        const n = rowOf.get(s.id);
        if (n && n > 1) data.push({ range: range(`A${n}`), values: [values] });
        else fresh.push(values);
      }
      await sheets.writeRanges(link.spreadsheetId, data);
      if (fresh.length) await sheets.append(link.spreadsheetId, range('A1'), fresh);
      if (batch.length) {
        // Si alguien modificó sus respuestas mientras se enviaba, queda pendiente para la siguiente.
        await q(db).update(submissions).set({ sheetSyncedAt: sql`now()` }).where(and(
          inArray(submissions.id, batch.map((s) => s.id)),
          lte(submissions.modifiedAt, startedAt),
          exists(q(db).select().from(sheetLinks).where(ours())), // solo si el lease sigue siendo nuestro (no hubo cambio de hoja)
        ));
      }
      await q(db).update(sheetLinks).set({ columns: layout }).where(ours());
      sent += batch.length;
      if (batch.length < BATCH) break;
    }
    await q(db).update(sheetLinks).set({ lastError: null }).where(ours());
    return { status: 'ok', sent, pending: await pendingCount(db, instrumentId) };
  } catch (err) {
    // El mensaje de GoogleError ya viene sin tokens; los demás errores solo van al log con su stack.
    if (!(err instanceof GoogleError)) console.error('[sheets] sincronización falló:', err instanceof Error ? err.stack : String(err));
    await q(db).update(sheetLinks).set({ lastError: ERROR_TEXT[err instanceof GoogleError ? err.reason : 'google'], lastErrorAt: new Date() })
      .where(ours());
    return { status: 'error', sent, pending: await pendingCount(db, instrumentId) };
  } finally {
    await q(db).update(sheetLinks).set({ leaseUntil: null }).where(ours());
  }
}
