import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getDb } from '@/db/client';
import { SESSION_COOKIE, can, getSessionUser } from './sessions';
import type { AdminUser } from './types';

export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; // cookies() primero: el build no debe tocar la base
  await connection(); // la sesión usa la hora actual: siempre en tiempo de solicitud
  return getSessionUser(getDb(), token);
});

export async function requireUser(need: 'view' | 'manage' = 'view'): Promise<AdminUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (!can(u, need)) redirect('/?e=permiso');
  return u;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', expires: expiresAt,
    secure: (process.env.APP_URL ?? '').startsWith('https'),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0,
    secure: (process.env.APP_URL ?? '').startsWith('https'),
  });
}
