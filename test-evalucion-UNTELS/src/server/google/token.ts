import { createHash } from 'node:crypto';
import { decryptSecret } from '@/server/auth/crypto';

export type TokenSource = { kind: 'oauth'; refreshTokenEnc: string };
export type GoogleReason = 'sin_permiso' | 'no_encontrada' | 'limite' | 'google';

export class GoogleError extends Error {
  constructor(message: string, public status: number, public reason: GoogleReason) {
    super(message);
    this.name = 'GoogleError';
  }
}

export const reasonOf = (status: number): GoogleReason =>
  status === 401 || status === 403 ? 'sin_permiso' : status === 404 ? 'no_encontrada' : status === 429 ? 'limite' : 'google';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const cache = new Map<string, { token: string; until: number }>();
// Solo para pruebas.
export const __resetTokenCache = () => cache.clear();

export async function getAccessToken(src: TokenSource, scopes: string[], fetchFn: typeof fetch = fetch): Promise<string> {
  // La llave de OAuth es un hash: el token cifrado no queda como llave del mapa.
  // La llave es un hash: el token cifrado no queda como llave del mapa.
  const key = `${createHash('sha256').update(src.refreshTokenEnc).digest('hex')}|${scopes.join(' ')}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.token;
  const form = {
    grant_type: 'refresh_token',
    refresh_token: decryptSecret(src.refreshTokenEnc),
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  };
  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.access_token !== 'string') {
    // Solo el código de error de Google, nunca el cuerpo completo.
    const code = typeof body.error === 'string' ? `: ${body.error.slice(0, 60)}` : '';
    throw new GoogleError(`No se pudo obtener el acceso a Google (${res.status}${code}).`, res.status, reasonOf(res.status));
  }
  cache.set(key, { token: body.access_token, until: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 });
  return body.access_token;
}
