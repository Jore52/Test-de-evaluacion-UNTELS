import { asc, eq, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { adminUsers } from '@/db/schema';
import { logAudit } from '@/server/audit';
import { PublicError } from '@/server/errors';
import { EMERGENCY_USERNAME, isEmail } from '@/server/auth/emergency';
import { assertCan, deleteUserSessions } from '@/server/auth/sessions';
import type { AdminUser } from '@/server/auth/types';

// cast: la union Pglite|Neon rompe las firmas de drizzle
const q = (db: Db) => db as PgliteDatabase<typeof schema>;

export async function listUsers(db: Db, actor: AdminUser) {
  assertCan(actor, 'manage');
  return q(db).select({
    id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role,
    active: adminUsers.active, lastLoginAt: adminUsers.lastLoginAt,
  }).from(adminUsers).orderBy(asc(adminUsers.email));
}

export async function addUser(db: Db, actor: AdminUser, input: { email: string; role: 'admin' | 'viewer' }): Promise<void> {
  assertCan(actor, 'manage');
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) throw new PublicError('invalid', 'Correo no válido.');
  if (input.role !== 'admin' && input.role !== 'viewer') throw new PublicError('invalid', 'Rol no válido.');
  const r = await q(db).insert(adminUsers).values({ email, role: input.role }).onConflictDoNothing().returning({ id: adminUsers.id });
  if (!r.length) throw new PublicError('invalid', 'Ese correo ya está en la lista.');
  await logAudit(db, { actor: actor.email, action: 'usuario_cambiado', target: email, details: { alta: true, role: input.role } });
}

export async function updateUser(db: Db, actor: AdminUser, id: string, patch: { role?: 'admin' | 'viewer'; active?: boolean }): Promise<void> {
  assertCan(actor, 'manage');
  if (id === actor.id) throw new PublicError('invalid', 'No puedes cambiar tu propio acceso.');
  const [u] = await q(db).select().from(adminUsers).where(eq(adminUsers.id, id));
  if (!u) throw new PublicError('not_found', 'No se encontró el usuario.');
  if (u.role === 'superadmin' || u.email === EMERGENCY_USERNAME) {
    throw new PublicError('invalid', 'La cuenta de emergencia se gestiona con el comando de recuperación.');
  }
  if (patch.role !== undefined && patch.role !== 'admin' && patch.role !== 'viewer') throw new PublicError('invalid', 'Rol no válido.');
  const role = patch.role ?? u.role;
  const active = patch.active ?? u.active;
  // bloquea a los admins activos: dos cambios simultáneos no pueden dejar el sistema sin admin
  await q(db).transaction(async (tx) => {
    const { rows } = await tx.execute(sql`select id, role from admin_users where role in ('admin','superadmin') and active for update`);
    const otherAdmins = (rows as { id: string; role: string }[]).filter((r) => r.role === 'admin' && r.id !== id);
    if (rows.some((r) => r.id === id && r.role === 'admin') && (role !== 'admin' || !active) && !otherAdmins.length) {
      throw new PublicError('invalid', 'Debe quedar al menos un administrador activo.');
    }
    await tx.update(adminUsers).set({ role, active }).where(eq(adminUsers.id, id));
  });
  if (!active) await deleteUserSessions(db, id);
  await logAudit(db, { actor: actor.email, action: 'usuario_cambiado', target: u.email, details: { role, active } });
}
