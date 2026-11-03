import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { adminUsers, sessions } from '@/db/schema';
import { PublicError } from '@/server/errors';
import type { AdminUser } from './types';

export const SESSION_COOKIE = 'wf_session';
export const SESSION_HOURS = 8;

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000);
  await q(db).delete(sessions).where(lt(sessions.expiresAt, now));
  await q(db).insert(sessions).values({ idHash: hash(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function getSessionUser(db: Db, token: string | undefined, now = new Date()): Promise<AdminUser | null> {
  if (!token) return null;
  const [r] = await q(db)
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, picture: adminUsers.picture, role: adminUsers.role, active: adminUsers.active, expiresAt: sessions.expiresAt })
    .from(sessions).innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
    .where(eq(sessions.idHash, hash(token)));
  if (!r || !r.active || r.expiresAt.getTime() < now.getTime()) return null;
  return { id: r.id, email: r.email, name: r.name, role: r.role, picture: r.picture };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await q(db).delete(sessions).where(eq(sessions.idHash, hash(token)));
}

export async function deleteUserSessions(db: Db, userId: string): Promise<void> {
  await q(db).delete(sessions).where(eq(sessions.userId, userId));
}

export function can(u: AdminUser, need: 'view' | 'manage'): boolean {
  return need === 'view' || u.role !== 'viewer';
}

export function assertCan(u: AdminUser | null, need: 'view' | 'manage'): asserts u is AdminUser {
  if (!u || !can(u, need)) throw new PublicError('forbidden', 'No tienes permiso para esta acción.');
}
