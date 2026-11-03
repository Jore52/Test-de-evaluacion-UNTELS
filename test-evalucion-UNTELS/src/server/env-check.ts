// APP_SECRET público de vitest/E2E: nunca debe llegar a un despliegue real.
const TEST_APP_SECRET = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=';

export function envProblems(env: Record<string, string | undefined>): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const p: string[] = [];
  const url = env.APP_URL ?? '';
  const local = /^http:\/\/localhost(:\d+)?(\/|$)/.test(url);
  if (Buffer.from(env.APP_SECRET ?? '', 'base64').length !== 32) p.push('APP_SECRET debe ser de 32 bytes en base64.');
  // E2E corre next start en localhost con la clave de prueba; fuera de localhost se rechaza.
  else if (env.APP_SECRET === TEST_APP_SECRET && !local) p.push('APP_SECRET es la clave pública de pruebas; genera una propia.');
  if (!env.DATABASE_URL) p.push('Falta DATABASE_URL.');
  if (!url.startsWith('https://') && !local) p.push('APP_URL debe usar https.');
  return p;
}
