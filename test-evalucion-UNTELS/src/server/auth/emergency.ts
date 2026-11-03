import { randomBytes } from 'node:crypto';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { adminUsers } from '@/db/schema';
import { logAudit } from '@/server/audit';
import { PublicError } from '@/server/errors';
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from './crypto';
import { deleteUserSessions } from './sessions';
import { newTotpSecret, otpauthUri, matchTotpStep } from './totp';
import type { AdminUser } from './types';

export const EMERGENCY_USERNAME = 'emergencia';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;

export async function emergencyLogin(
  db: Db, input: { username: string; password: string; code: string }, now = new Date(),
): Promise<AdminUser> {
  const fail = async (why: string) => {
    await logAudit(db, { actor: EMERGENCY_USERNAME, action: 'login_rechazado', target: EMERGENCY_USERNAME, details: { motivo: why } });
    throw new PublicError('forbidden', 'Credenciales inválidas.');
  };
  const [u] = await q(db).select().from(adminUsers).where(eq(adminUsers.email, EMERGENCY_USERNAME));
  if (input.username.trim().toLowerCase() !== EMERGENCY_USERNAME || !u || !u.active || !u.passwordHash || !u.totpSecretEnc) {
    return fail('usuario');
  }
  const expired = u.lockedUntil && u.lockedUntil.getTime() <= now.getTime();
  if (u.lockedUntil && !expired) {
    await logAudit(db, { actor: EMERGENCY_USERNAME, action: 'login_rechazado', target: EMERGENCY_USERNAME, details: { motivo: 'bloqueada' } });
    throw new PublicError('forbidden', 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.');
  }
  const okPw = await verifyPassword(input.password, u.passwordHash);
  const step = matchTotpStep(decryptSecret(u.totpSecretEnc), input.code.trim(), now.getTime() / 1000);
  // el paso debe ser mayor al último usado, y se guarda atómicamente (anti-repetición)
  let okCode = false;
  if (okPw && step !== null) {
    const [r] = await q(db).update(adminUsers).set({ lastTotpStep: step })
      .where(and(eq(adminUsers.id, u.id), or(isNull(adminUsers.lastTotpStep), lt(adminUsers.lastTotpStep, step))))
      .returning({ id: adminUsers.id });
    okCode = Boolean(r);
  }
  if (!okPw || !okCode) {
    // UPDATE atómico: intentos paralelos no se pisan el contador
    // todo en un UPDATE (lee la fila actual): fallos paralelos no pierden cuentas; bloqueo vencido reinicia en 1
    const nowTs = sql`${now.toISOString()}::timestamptz`;
    const stale = sql`${adminUsers.lockedUntil} IS NOT NULL AND ${adminUsers.lockedUntil} <= ${nowTs}`;
    const next = sql`CASE WHEN ${stale} THEN 1 ELSE ${adminUsers.failedAttempts} + 1 END`;
    await q(db).update(adminUsers).set({
      failedAttempts: next,
      lockedUntil: sql`CASE WHEN ${next} >= ${MAX_FAILS} THEN ${new Date(now.getTime() + LOCK_MS).toISOString()}::timestamptz WHEN ${stale} THEN NULL ELSE ${adminUsers.lockedUntil} END`,
    }).where(eq(adminUsers.id, u.id));
    return fail(okPw ? 'codigo' : 'clave');
  }
  await q(db).update(adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now }).where(eq(adminUsers.id, u.id));
  await logAudit(db, { actor: EMERGENCY_USERNAME, action: 'login_emergencia', target: EMERGENCY_USERNAME });
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export async function resetEmergency(
  db: Db, fixed: { password?: string; totpSecret?: string } = {},
): Promise<{ username: string; password: string; totpSecret: string; otpauth: string }> {
  const password = fixed.password ?? randomBytes(18).toString('base64url'); // 24 caracteres
  const totpSecret = fixed.totpSecret ?? newTotpSecret();
  const vals = {
    role: 'superadmin' as const, active: true, name: 'Cuenta de emergencia',
    passwordHash: await hashPassword(password), totpSecretEnc: encryptSecret(totpSecret),
    failedAttempts: 0, lockedUntil: null, lastTotpStep: null,
  };
  const [u] = await q(db).insert(adminUsers).values({ email: EMERGENCY_USERNAME, ...vals })
    .onConflictDoUpdate({ target: adminUsers.email, set: vals }).returning({ id: adminUsers.id });
  await deleteUserSessions(db, u.id);
  await logAudit(db, { actor: 'sistema', action: 'emergencia_restablecida', target: EMERGENCY_USERNAME });
  return { username: EMERGENCY_USERNAME, password, totpSecret, otpauth: otpauthUri(totpSecret, EMERGENCY_USERNAME) };
}

export async function addAllowedUser(db: Db, email: string, role: 'admin' | 'viewer'): Promise<AdminUser> {
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) throw new PublicError('invalid', 'Correo no válido.');
  const [u] = await q(db).insert(adminUsers).values({ email: e, role, active: true })
    .onConflictDoUpdate({ target: adminUsers.email, set: { role, active: true } }).returning();
  await logAudit(db, { actor: 'sistema', action: 'usuario_autorizado', target: e, details: { role } });
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export const isEmail = (e: string) => e !== EMERGENCY_USERNAME && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
