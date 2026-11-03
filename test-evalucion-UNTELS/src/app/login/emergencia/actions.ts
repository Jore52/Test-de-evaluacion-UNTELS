'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/db/client';
import { PublicError } from '@/server/errors';
import { checkRateLimit, clientKey } from '@/server/rate-limit';
import { setSessionCookie } from '@/server/auth/current-user';
import { emergencyLogin } from '@/server/auth/emergency';
import { createSession } from '@/server/auth/sessions';

export async function emergencyAction(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const db = getDb();
  if (!(await checkRateLimit(db, `emerg:${clientKey(await headers())}`, { limit: 10, windowSeconds: 900 }))) {
    return { error: 'Demasiados intentos. Espera unos minutos.' };
  }
  const s = (k: string) => String(form.get(k) ?? '');
  try {
    const user = await emergencyLogin(db, { username: s('username'), password: s('password'), code: s('code') });
    const { token, expiresAt } = await createSession(db, user.id);
    await setSessionCookie(token, expiresAt);
  } catch (e) {
    if (e instanceof PublicError) return { error: e.message };
    throw e;
  }
  redirect('/');
}
