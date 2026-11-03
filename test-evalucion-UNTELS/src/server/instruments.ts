import { desc, eq, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { instruments, submissions } from '@/db/schema';
import { parseInstrument } from '@/lib/instrument-schema';
import { createDefaultInstrument, type Instrument, type SurveyResponse } from '@/lib/types';
import { logAudit } from './audit';
import { PublicError } from './errors';
import type { AdminUser } from './auth/types';

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;
const notFound = () => new PublicError('not_found', 'No se encontró el instrumento.');

export async function listInstruments(db: Db): Promise<(Instrument & { responseCount: number })[]> {
  const rows = await q(db).select({
    doc: instruments.doc,
    // nombres calificados: drizzle los escribe sin tabla y "id" se resolvería a submissions.id (uuid ≠ text)
    count: sql<number>`(select count(*)::int from "submissions" s where s."instrument_id" = "instruments"."id")`,
  }).from(instruments).orderBy(desc(instruments.updatedAt));
  return rows.map((r) => ({ ...r.doc, responseCount: Number(r.count) }));
}

export async function getInstrument(db: Db, id: string): Promise<Instrument> {
  const [r] = await q(db).select({ doc: instruments.doc }).from(instruments).where(eq(instruments.id, id));
  if (!r) throw notFound();
  return r.doc;
}

export async function getPublished(db: Db, id: string): Promise<Instrument | null> {
  const [r] = await q(db).select({ doc: instruments.publishedDoc }).from(instruments).where(eq(instruments.id, id));
  return r?.doc ?? null;
}

export async function createInstrument(db: Db, user: AdminUser, raw?: unknown): Promise<Instrument> {
  const doc = raw ? parseInstrument(raw) : createDefaultInstrument();
  if (!doc) throw new PublicError('invalid', 'Instrumento inválido.');
  const now = new Date().toISOString();
  const fresh = { ...doc, id: crypto.randomUUID(), status: 'draft' as const, createdAt: now, updatedAt: now };
  await q(db).insert(instruments).values({ id: fresh.id, doc: fresh, createdBy: user.email });
  await logAudit(db, { actor: user.email, action: 'instrumento_creado', target: fresh.id });
  return fresh;
}

export async function saveInstrument(db: Db, id: string, raw: unknown): Promise<Instrument> {
  const doc = parseInstrument(raw);
  if (!doc || doc.id !== id) throw new PublicError('invalid', 'Instrumento inválido.');
  const now = new Date();
  // status lo controla publish/unpublish, no el autoguardado
  const [r] = await q(db).update(instruments)
    .set({ doc: sql`jsonb_set(${JSON.stringify({ ...doc, updatedAt: now.toISOString() })}::jsonb, '{status}', ${instruments.doc}->'status')`, updatedAt: now })
    .where(eq(instruments.id, id)).returning({ doc: instruments.doc });
  if (!r) throw notFound();
  return r.doc;
}

export async function deleteInstrument(db: Db, user: AdminUser, id: string): Promise<void> {
  const r = await q(db).delete(instruments).where(eq(instruments.id, id)).returning({ id: instruments.id });
  if (!r.length) throw notFound();
  await logAudit(db, { actor: user.email, action: 'instrumento_eliminado', target: id });
}

export async function duplicateInstrument(db: Db, user: AdminUser, id: string): Promise<Instrument> {
  const doc = await getInstrument(db, id);
  return createInstrument(db, user, { ...doc, title: `${doc.title} (copia)` });
}

/** Copia el borrador al snapshot público. */
export async function publishInstrument(db: Db, user: AdminUser, id: string, publish: boolean): Promise<Instrument> {
  const doc = await getInstrument(db, id);
  const next: Instrument = { ...doc, status: publish ? 'published' : 'draft' };
  if (publish && next.questions.length === 0) throw new PublicError('invalid', 'Agrega al menos una pregunta antes de publicar.');
  await q(db).update(instruments).set({ doc: next, publishedDoc: publish ? next : null, updatedAt: new Date() }).where(eq(instruments.id, id));
  await logAudit(db, { actor: user.email, action: publish ? 'instrumento_publicado' : 'instrumento_despublicado', target: id });
  return next;
}

/** Respuestas para el panel de Resultados (más recientes primero). */
export async function listResponses(db: Db, id: string): Promise<SurveyResponse[]> {
  // shortcut: trae todas en memoria; paginar si un instrumento supera ~20 000 respuestas
  const rows = await q(db).select().from(submissions).where(eq(submissions.instrumentId, id)).orderBy(desc(submissions.completedAt));
  return rows.map((r) => ({
    id: r.id, instrumentId: r.instrumentId, respondentName: r.respondentName, answers: r.answers,
    totalScore: r.totalScore, submittedAt: r.completedAt.toISOString(), result: r.result,
  }));
}
