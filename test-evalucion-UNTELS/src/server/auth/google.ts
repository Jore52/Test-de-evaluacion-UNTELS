import { eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { adminUsers } from '@/db/schema';
import { logAudit } from '@/server/audit';
import { PublicError } from '@/server/errors';
import type { AdminUser } from './types';

export interface GoogleClaims { email?: string; email_verified?: boolean; name?: string; picture?: string }

export async function resolveGoogleLogin(db: Db, claims: GoogleClaims): Promise<AdminUser> {
  const email = (claims.email ?? '').trim().toLowerCase();
  const reject = async (msg: string) => {
    await logAudit(db, { actor: email || 'desconocido', action: 'login_rechazado', target: email, details: { motivo: msg } });
    throw new PublicError('forbidden', msg);
  };
  if (claims.email_verified !== true || !email) return reject('Tu correo de Google no está verificado.');
  // cast: la union Pglite|Neon rompe las firmas de drizzle
  const pg = db as PgliteDatabase<typeof schema>;
  const [u] = await pg.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!u || !u.active) return reject('Tu correo no está autorizado. Pide acceso a un administrador.');
  const name = u.name || claims.name?.trim() || '';
  const picture = claims.picture ?? u.picture;
  await pg.update(adminUsers).set({ lastLoginAt: new Date(), name, picture }).where(eq(adminUsers.id, u.id));
  await logAudit(db, { actor: email, action: 'login', target: email });
  return { id: u.id, email: u.email, name, role: u.role, picture };
}
