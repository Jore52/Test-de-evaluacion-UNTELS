import { eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { sheetLinks, submissions } from '@/db/schema';
import { logAudit } from '@/server/audit';
import { googleConfigured } from '@/server/auth/google-config';
import { assertCan } from '@/server/auth/sessions';
import type { AdminUser } from '@/server/auth/types';
import { PublicError } from '@/server/errors';
import { sheetsApi, spreadsheetIdFromUrl, type SheetsApi } from '@/server/google/sheets-api';
import { GoogleError } from '@/server/google/token';
import { getInstrument } from '@/server/instruments';
import { mergeColumns, sheetColumns } from '@/lib/sheet-columns';
import { buildDashboardRequests, DASHBOARD_TAB } from './dashboard';
import { ERROR_TEXT, pendingCount, SHEET_TAB, syncInstrument } from './sync';

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;

export const SHEETS_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/spreadsheets'];

// Mensajes fijos de ?sheets=<código>: la URL solo trae el código, nunca el texto.
export const SHEETS_MSG = {
  ok: 'Hoja vinculada. Las respuestas se están enviando.',
  cancelado: 'Se canceló la conexión con Google.',
  sin_refresh: 'Google no entregó permiso permanente; vuelve a intentarlo.',
  sin_config: 'Falta configurar Google (ver README).',
  enlace: 'El enlace no es de una hoja de Google Sheets.',
  permiso: 'Tu cuenta no tiene permiso de Editor en esa hoja.',
  no_encontrada: 'No se encontró la hoja; revisa el enlace.',
  google: 'Google no respondió o limitó los envíos; vuelve a intentarlo.',
  error: 'No se pudo conectar con Google; vuelve a intentarlo.',
} as const;
export type SheetsCode = keyof typeof SHEETS_MSG;
export const codeOf = (e: PublicError): SheetsCode =>
  (Object.keys(SHEETS_MSG) as SheetsCode[]).find((k) => SHEETS_MSG[k] === e.message) ?? (e.code === 'invalid' ? 'google' : 'error');

type LinkInput = { target: { create: true } | { url: string }; refreshTokenEnc: string; connectedEmail?: string };

/** Vincula (o cambia) la hoja. La base no se toca: todas las respuestas se reenvían a la hoja nueva. */
export async function linkSheet(db: Db, actor: AdminUser, instrumentId: string, input: LinkInput, api?: SheetsApi): Promise<{ sent: number }> {
  assertCan(actor, 'manage');
  let spreadsheetId: string | null = null;
  if ('url' in input.target) {
    spreadsheetId = spreadsheetIdFromUrl(input.target.url);
    if (!spreadsheetId) throw new PublicError('invalid', SHEETS_MSG.enlace);
  }
  const { title } = await getInstrument(db, instrumentId);
  const sheets = api ?? sheetsApi({ kind: 'oauth', refreshTokenEnc: input.refreshTokenEnc });

  let url: string;
  try {
    if (!spreadsheetId) ({ spreadsheetId, url } = await sheets.create(`${title} – Respuestas`));
    else url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    // Verifica el acceso de escritura antes de guardar nada; la sincronización reescribe la fila 1 completa.
    if (!(await sheets.meta(spreadsheetId)).sheets.some((t) => t.title === SHEET_TAB)) await sheets.addSheet(spreadsheetId, SHEET_TAB);
    await sheets.writeRanges(spreadsheetId, [{ range: `'${SHEET_TAB}'!A1`, values: [['ID']] }]);
  } catch (e) {
    if (!(e instanceof GoogleError)) throw e;
    if (e.reason === 'sin_permiso') throw new PublicError('invalid', SHEETS_MSG.permiso);
    throw new PublicError('invalid', e.reason === 'no_encontrada' ? SHEETS_MSG.no_encontrada : ERROR_TEXT[e.reason]);
  }

  const values = {
    spreadsheetId, spreadsheetUrl: url, refreshTokenEnc: input.refreshTokenEnc, connectedEmail: input.connectedEmail ?? null,
    columns: [], dashboard: false, lastError: null, lastErrorAt: null, leaseUntil: null, createdBy: actor.email, createdAt: new Date(),
  };
  await q(db).insert(sheetLinks).values({ instrumentId, ...values }).onConflictDoUpdate({ target: sheetLinks.instrumentId, set: values });
  await q(db).update(submissions).set({ sheetSyncedAt: null }).where(eq(submissions.instrumentId, instrumentId));
  await logAudit(db, { actor: actor.email, action: 'sheets_vinculado', target: instrumentId, details: { hoja: spreadsheetId } });
  const r = await syncInstrument(db, instrumentId, sheets);
  return { sent: r.sent };
}

/** Solo borra el vínculo: las respuestas siguen en la base y en la hoja anterior. */
export async function unlinkSheet(db: Db, actor: AdminUser, instrumentId: string): Promise<void> {
  assertCan(actor, 'manage');
  await q(db).delete(sheetLinks).where(eq(sheetLinks.instrumentId, instrumentId));
  await logAudit(db, { actor: actor.email, action: 'sheets_desvinculado', target: instrumentId });
}

export async function syncNow(db: Db, actor: AdminUser, instrumentId: string, api?: SheetsApi) {
  assertCan(actor, 'manage');
  const r = await syncInstrument(db, instrumentId, api);
  await logAudit(db, { actor: actor.email, action: 'sheets_sincronizado', target: instrumentId, details: { enviados: r.sent } });
  return r;
}

/** Disparo automático tras cada envío: un fallo nunca llega al encuestado (queda pendiente y se reintenta). */
export async function syncIfLinked(db: Db, instrumentId: string, api?: SheetsApi): Promise<void> {
  try {
    // Repite si algo llegó mientras corría (su disparo vio el lease ocupado y salió); tope de 3 vueltas.
    for (let i = 0; i < 3; i++) {
      const r = await syncInstrument(db, instrumentId, api);
      if (r.status !== 'ok' || (await pendingCount(db, instrumentId)) === 0) break;
    }
  } catch (e) {
    console.error('[sheets] disparo automático falló:', e instanceof Error ? e.stack : String(e));
  }
}

/** La pestaña Dashboard se crea una sola vez y nunca se sobrescribe; desactivar no la borra. */
export async function setDashboard(db: Db, actor: AdminUser, instrumentId: string, on: boolean, api?: SheetsApi): Promise<void> {
  assertCan(actor, 'manage');
  const [link] = await q(db).select().from(sheetLinks).where(eq(sheetLinks.instrumentId, instrumentId));
  if (!link) throw new PublicError('not_found', 'La hoja ya no está vinculada.');
  if (on) {
    const sheets = api ?? sheetsApi({ kind: 'oauth', refreshTokenEnc: link.refreshTokenEnc });
    try {
      if (!(await sheets.meta(link.spreadsheetId)).sheets.some((t) => t.title === DASHBOARD_TAB)) {
        const inst = await getInstrument(db, instrumentId);
        const sheetId = await sheets.addSheet(link.spreadsheetId, DASHBOARD_TAB);
        const { values, requests } = buildDashboardRequests(mergeColumns(link.columns, sheetColumns(inst)).layout, inst, sheetId);
        await sheets.writeFormulas(link.spreadsheetId, values);
        await sheets.batchUpdate(link.spreadsheetId, requests);
      }
    } catch (e) {
      if (!(e instanceof GoogleError)) throw e;
      throw new PublicError('invalid', ERROR_TEXT[e.reason]);
    }
  }
  await q(db).update(sheetLinks).set({ dashboard: on }).where(eq(sheetLinks.instrumentId, instrumentId));
  await logAudit(db, { actor: actor.email, action: 'sheets_dashboard', target: instrumentId, details: { activo: on } });
}

export async function getSheetStatus(db: Db, instrumentId: string) {
  const [l] = await q(db).select().from(sheetLinks).where(eq(sheetLinks.instrumentId, instrumentId));
  if (!l) return { linked: false as const, available: googleConfigured() };
  return {
    linked: true as const, available: googleConfigured(), url: l.spreadsheetUrl, connectedEmail: l.connectedEmail, dashboard: l.dashboard,
    pending: await pendingCount(db, instrumentId), lastError: l.lastError, lastErrorAt: l.lastErrorAt,
  };
}
