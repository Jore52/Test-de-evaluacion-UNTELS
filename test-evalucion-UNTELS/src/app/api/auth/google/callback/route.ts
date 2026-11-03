import { connection } from 'next/server';
import { cookies, headers } from 'next/headers';
import { decodeIdToken } from 'arctic';
import { getDb } from '@/db/client';
import { PublicError } from '@/server/errors';
import { checkRateLimit, clientKey } from '@/server/rate-limit';
import { createSession } from '@/server/auth/sessions';
import { setSessionCookie } from '@/server/auth/current-user';
import { resolveGoogleLogin, type GoogleClaims } from '@/server/auth/google';
import { appUrl, googleClient, googleConfigured, loginRedirect } from '@/server/auth/google-config';

export async function GET(req: Request) {
  await connection(); // dinamica: sin esto el build la prerenderiza
  if (!googleConfigured()) return loginRedirect('google_no_configurado');
  const jar = await cookies();
  const state = jar.get('oauth_state')?.value;
  const verifier = jar.get('oauth_verifier')?.value;
  jar.delete({ name: 'oauth_state', path: '/api/auth' });
  jar.delete({ name: 'oauth_verifier', path: '/api/auth' });
  const q = new URL(req.url).searchParams;
  const code = q.get('code');
  if (!state || !verifier || !code || q.get('state') !== state) return loginRedirect('estado_invalido');
  try {
    const db = getDb();
    if (!(await checkRateLimit(db, `login:${clientKey(await headers())}`, { limit: 20, windowSeconds: 300 }))) return loginRedirect('error');
    const tokens = await googleClient().validateAuthorizationCode(code, verifier);
    // Sin verificar la firma: el id_token llega directo del token endpoint de Google por TLS, no del navegador.
    const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
    const user = await resolveGoogleLogin(db, claims);
    const s = await createSession(db, user.id);
    await setSessionCookie(s.token, s.expiresAt);
    return Response.redirect(`${appUrl()}/`, 302);
  } catch (e) {
    if (e instanceof PublicError && e.code === 'forbidden') {
      return loginRedirect(e.message.includes('verificado') ? 'no_verificado' : 'no_autorizado');
    }
    return loginRedirect('error');
  }
}
