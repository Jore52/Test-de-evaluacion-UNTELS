import { envProblems } from '@/server/env-check';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const problemas = envProblems(process.env);
  if (problemas.length) throw new Error('Configuración inválida: ' + problemas.join(' '));
  // Local (PGlite): aplica migraciones pendientes al arrancar; en producción las corre el build.
  if (process.env.DATABASE_URL?.startsWith('pglite://')) {
    const [{ getDb }, { runMigrations }] = await Promise.all([import('@/db/client'), import('@/db/migrate')]);
    await runMigrations(getDb());
  }
}
