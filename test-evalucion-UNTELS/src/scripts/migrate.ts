import { runMigrations } from '@/db/migrate';

async function main() {
  process.env.DATABASE_URL ??= 'pglite://./.data/dev';
  const url = process.env.DATABASE_URL!;
  console.log(`Base de datos: ${url.startsWith('pglite://') ? url : `postgres ${new URL(url).host}`}`);
  const { getDb } = await import('@/db/client');
  await runMigrations(getDb());
  console.log('Migraciones aplicadas.');
  process.exit(0);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
