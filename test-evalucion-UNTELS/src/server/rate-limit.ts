import { createHash } from 'node:crypto';
import { lt, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { rateLimits } from '@/db/schema';

export async function checkRateLimit(
  db: Db, key: string, opts: { limit?: number; windowSeconds?: number } = {},
): Promise<boolean> {
  const { limit = 60, windowSeconds = 60 } = opts;
  const ms = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / ms) * ms);
  // cast: la union Pglite|Neon rompe la firma de returning()
  const pg = db as PgliteDatabase<typeof schema>;
  // limpieza oportunista: sin cron, evita que la tabla crezca sin fin (1 DELETE barato por llamada)
  await pg.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 3600_000)));
  const [row] = await pg
    .insert(rateLimits).values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

export function clientKey(headers: Headers): string {
  // x-forwarded-for a la izquierda lo controla el cliente; x-real-ip lo pone el proxy, y el ultimo valor lo agrega el proxy
  const ip = headers.get(process.env.TRUSTED_IP_HEADER || 'x-real-ip')?.trim()
    || headers.get('x-forwarded-for')?.split(',').map((x) => x.trim()).filter(Boolean).pop();
  return ip ? createHash('sha256').update(ip).digest('hex') : 'unknown';
}
