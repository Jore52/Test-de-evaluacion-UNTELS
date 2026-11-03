import path from 'node:path';
import fs from 'node:fs';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzleNeon, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

// Solo pruebas de carga locales (load/): Postgres en Docker detrás del wsproxy de Neon. En Vercel/Neon no se define.
if (process.env.NEON_LOCAL_WSPROXY) {
  neonConfig.wsProxy = () => process.env.NEON_LOCAL_WSPROXY!;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export type Db = PgliteDatabase<typeof schema> | NeonDatabase<typeof schema>;

// globalThis: HMR/separate bundles re-evaluate this module; PGlite allows one instance per data dir.
const g = globalThis as typeof globalThis & { __webFrontDb?: Db };

export function getDb(): Db {
  if (g.__webFrontDb) return g.__webFrontDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no esta definida');
  if (url.startsWith('pglite://')) {
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), url.slice('pglite://'.length));
    fs.mkdirSync(dir, { recursive: true });
    g.__webFrontDb = drizzlePglite({ client: new PGlite(dir), schema });
  } else {
    g.__webFrontDb = drizzleNeon({ client: new Pool({ connectionString: url }), schema });
  }
  return g.__webFrontDb!;
}
