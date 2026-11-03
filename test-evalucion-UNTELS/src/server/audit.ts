import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { auditLog } from '@/db/schema';

export async function logAudit(db: Db, e: { actor: string; action: string; target: string; details?: unknown }): Promise<void> {
  // cast: la union Pglite|Neon rompe la firma de insert()
  await (db as PgliteDatabase<typeof schema>).insert(auditLog).values({
    actor: e.actor, action: e.action, target: e.target, details: (e.details ?? {}) as Record<string, unknown>,
  });
}
