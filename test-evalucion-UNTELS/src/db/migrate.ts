import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import type { Db } from '@/db/client';

export async function runMigrations(db: Db): Promise<void> {
  const migrationsFolder = path.resolve(process.cwd(), 'src/db/migrations');
  // cast: la union Pglite|Neon rompe la firma de migrate()
  if (process.env.DATABASE_URL!.startsWith('pglite://')) await migratePglite(db as never, { migrationsFolder });
  else await migrateNeon(db as never, { migrationsFolder });
}
