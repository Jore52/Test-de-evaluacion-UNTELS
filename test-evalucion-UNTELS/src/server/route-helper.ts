import { NextResponse } from 'next/server';
import { getDb, type Db } from '@/db/client';
import { PublicError } from './errors';
import { checkRateLimit, clientKey } from './rate-limit';

const MAX_BODY = 256 * 1024;
const STATUS = { not_found: 404, not_available: 409, invalid: 400, forbidden: 403 } as const;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

/** Lee el cuerpo contando bytes; aborta al pasar el tope sin bufferizar todo. */
async function readCapped(req: Request): Promise<string> {
  if (Number(req.headers.get('content-length')) > MAX_BODY) throw new Error('too large');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = req.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) { await reader.cancel(); throw new Error('too large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** POST público: rate limit, cuerpo JSON acotado y mapeo de errores. */
export async function handlePost(
  req: Request, ctx: { params: Promise<{ id: string }> },
  run: (db: Db, id: string, body: Record<string, unknown>) => Promise<unknown>, // una Response se devuelve tal cual (imagen)
): Promise<NextResponse> {
  try {
    const db = getDb();
    // 300/min por IP: un colegio entero suele salir por una sola IP (NAT)
    if (!(await checkRateLimit(db, clientKey(req.headers), { limit: 300 }))) return json({ error: 'Demasiados envíos, espera un minuto.' }, 429);
    let body: unknown;
    try { body = JSON.parse(await readCapped(req)); } catch { body = undefined; }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return json({ error: 'Solicitud inválida.' }, 400);
    const { id } = await ctx.params;
    const out = await run(db, id, body as Record<string, unknown>);
    return out instanceof Response ? (out as NextResponse) : json(out);
  } catch (e) {
    if (e instanceof PublicError) return json({ error: e.message }, STATUS[e.code]);
    console.error(e);
    return json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' }, 500);
  }
}
