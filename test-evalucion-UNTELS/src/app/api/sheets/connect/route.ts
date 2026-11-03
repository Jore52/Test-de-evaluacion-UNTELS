import { cookies } from 'next/headers';
import { generateCodeVerifier, generateState } from 'arctic';
import { getCurrentUser } from '@/server/auth/current-user';
import { can } from '@/server/auth/sessions';
import { googleConfigured, sameOrigin, SHEETS_COOKIE, sheetsClient, sheetsRedirect as backTo } from '@/server/auth/google-config';
import { spreadsheetIdFromUrl } from '@/server/google/sheets-api';
import { SHEETS_SCOPES } from '@/server/sheets/link';

// Solo POST desde el propio sitio: un enlace o <img> de otro sitio no puede iniciar la vinculación a una hoja ajena.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response('Origen no permitido.', { status: 403 });
  const u = await getCurrentUser();
  if (!u || !can(u, 'manage')) return new Response('Sin permiso.', { status: 403 });
  const f = await req.formData().catch(() => null);
  const s = (k: string) => String(f?.get(k) ?? '');
  const id = s('id');
  const modo = s('modo') === 'existente' ? 'existente' : 'nueva';
  const url = modo === 'existente' ? s('url') : '';
  if (!googleConfigured()) return backTo(id, 'sin_config');
  // Falla antes de ir a Google si el enlace o la fecha no sirven.
  if (modo === 'existente' && (url.length > 500 || !spreadsheetIdFromUrl(url))) return backTo(id, 'enlace');
  const state = generateState();
  const verifier = generateCodeVerifier();
  const auth = sheetsClient().createAuthorizationURL(state, verifier, SHEETS_SCOPES);
  auth.searchParams.set('access_type', 'offline');
  auth.searchParams.set('prompt', 'consent');
  (await cookies()).set('sheets_oauth', JSON.stringify({ state, verifier, id, modo, url }), SHEETS_COOKIE);
  return Response.redirect(auth.toString(), 303);
}
