import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { decodeIdToken } from 'arctic';
import { getDb } from '@/db/client';
import { getCurrentUser } from '@/server/auth/current-user';
import { encryptSecret } from '@/server/auth/crypto';
import { googleConfigured, sheetsClient, sheetsRedirect as backTo } from '@/server/auth/google-config';
import { can } from '@/server/auth/sessions';
import { PublicError } from '@/server/errors';
import { codeOf, linkSheet } from '@/server/sheets/link';

type Saved = { state: string; verifier: string; id: string; modo: string; url: string };

export const maxDuration = 300;

export async function GET(req: Request) {
  await connection(); // dinamica: sin esto el build la prerenderiza
  const jar = await cookies();
  let saved: Saved | null = null;
  try { saved = JSON.parse(jar.get('sheets_oauth')?.value ?? ''); } catch { /* sin cookie o alterada */ }
  jar.delete({ name: 'sheets_oauth', path: '/api/sheets' }); // en toda salida
  const q = new URL(req.url).searchParams;
  const code = q.get('code');
  const stateOk = typeof saved?.state === 'string' && typeof saved.id === 'string' && q.get('state') === saved.state;
  if (stateOk && q.get('error')) return backTo(saved!.id, 'cancelado'); // el admin rechazó o Google devolvió un error
  if (!saved || !stateOk || !code) {
    return new Response('Solicitud inválida o vencida. Vuelve al instrumento e inténtalo de nuevo.', { status: 400 });
  }
  const u = await getCurrentUser();
  if (!u || !can(u, 'manage')) return new Response('Sin permiso.', { status: 403 });
  if (!googleConfigured()) return backTo(saved.id, 'sin_config');
  try {
    const tokens = await sheetsClient().validateAuthorizationCode(code, saved.verifier);
    if (!tokens.hasRefreshToken()) return backTo(saved.id, 'sin_refresh');
    // Sin verificar la firma: el id_token llega directo del token endpoint de Google por TLS, no del navegador.
    const claims = decodeIdToken(tokens.idToken()) as { email?: unknown };
    await linkSheet(getDb(), u, saved.id, {
      target: saved.modo === 'existente' ? { url: String(saved.url) } : { create: true },
      refreshTokenEnc: encryptSecret(tokens.refreshToken()),
      connectedEmail: typeof claims.email === 'string' ? claims.email : undefined,
    });
    return backTo(saved.id, 'ok');
  } catch (e) {
    if (e instanceof PublicError) return backTo(saved.id, codeOf(e));
    // Solo el tipo: los errores del canje pueden traer el código o tokens.
    console.error('[sheets] conexión con Google falló:', e instanceof Error ? e.name : 'error');
    return backTo(saved.id, 'error');
  }
}
