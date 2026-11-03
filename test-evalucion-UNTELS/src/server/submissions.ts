import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { submissions } from '@/db/schema';
import { validateAnswers } from '@/lib/answers';
import { computeResult, type SurveyResult } from '@/lib/scoring';
import type { AnswerValue, Instrument } from '@/lib/types';
import { PublicError } from './errors';
import { getPublished } from './instruments';

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;

export interface MySubmission { name: string; answers: Record<string, AnswerValue>; result: SurveyResult; completedAt: Date }

/** El token vive solo en el navegador del encuestado; en la base guardamos su hash. */
export function deviceHash(token: unknown): string {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw new PublicError('invalid', 'Solicitud inválida.');
  return createHash('sha256').update(token).digest('hex');
}

export async function publishedOrThrow(db: Db, id: string): Promise<Instrument> {
  const inst = await getPublished(db, id);
  if (!inst) throw new PublicError('not_found', 'Este instrumento no está disponible.');
  return inst;
}

export async function findMine(db: Db, instrumentId: string, token: unknown): Promise<MySubmission | null> {
  const [r] = await q(db).select({
    name: submissions.respondentName, answers: submissions.answers, result: submissions.result, completedAt: submissions.completedAt,
  }).from(submissions).where(and(eq(submissions.instrumentId, instrumentId), eq(submissions.deviceTokenHash, deviceHash(token))));
  return r ?? null;
}

/** Guarda (o actualiza si el instrumento permite modificar) la respuesta del dispositivo. El resultado se calcula aquí, nunca en el cliente. */
export async function submit(db: Db, instrumentId: string, body: Record<string, unknown>): Promise<MySubmission & { already: boolean }> {
  const inst = await publishedOrThrow(db, instrumentId);
  const hash = deviceHash(body.deviceToken);
  const name = ''; // sin nombre: si el admin lo necesita, lo pide como pregunta
  const { answers, missing } = validateAnswers(inst, body.answers);
  if (missing.length) throw new PublicError('invalid', 'Faltan preguntas obligatorias por responder.');
  const result = computeResult(inst, answers);
  const now = new Date();
  const values = { instrumentId, respondentName: name, answers, result, totalScore: result.totalScore, deviceTokenHash: hash, completedAt: now, modifiedAt: now };

  const base = q(db).insert(submissions).values(values);
  const rows = inst.generalConfig.singleResponse
    ? await base.onConflictDoNothing().returning({ id: submissions.id })
    : await base.onConflictDoUpdate({
        target: [submissions.instrumentId, submissions.deviceTokenHash],
        // sheetSyncedAt = null: la fila editada se reenvía a Sheets
        set: { respondentName: name, answers, result, totalScore: result.totalScore, modifiedAt: now, sheetSyncedAt: null },
      }).returning({ id: submissions.id });

  if (!rows.length) {
    // ya respondió y solo se permite una vez: devolvemos su resultado guardado
    const mine = await findMine(db, instrumentId, body.deviceToken);
    if (!mine) throw new PublicError('not_available', 'No pudimos registrar tu respuesta. Inténtalo de nuevo.');
    return { ...mine, already: true };
  }
  return { name, answers, result, completedAt: now, already: false };
}
