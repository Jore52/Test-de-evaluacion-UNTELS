import { cookies } from 'next/headers';
import { getDb } from '@/db/client';
import { SESSION_COOKIE, deleteSession } from '@/server/auth/sessions';
import { clearSessionCookie } from '@/server/auth/current-user';
import { appUrl } from '@/server/auth/google-config';

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  await clearSessionCookie();
  return Response.redirect(`${appUrl()}/login`, 303);
}
