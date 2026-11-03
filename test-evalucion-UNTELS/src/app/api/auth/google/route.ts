import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { generateCodeVerifier, generateState } from 'arctic';
import { googleClient, googleConfigured, loginRedirect, OAUTH_COOKIE } from '@/server/auth/google-config';

export async function GET() {
  await connection(); // dinamica: sin esto el build la prerenderiza
  if (!googleConfigured()) return loginRedirect('google_no_configurado');
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ['openid', 'email', 'profile']);
  url.searchParams.set('prompt', 'select_account');
  const jar = await cookies();
  jar.set('oauth_state', state, OAUTH_COOKIE);
  jar.set('oauth_verifier', verifier, OAUTH_COOKIE);
  return Response.redirect(url.toString(), 302);
}
