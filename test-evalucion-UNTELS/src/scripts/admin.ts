import { runMigrations } from '@/db/migrate';
import QRCode from 'qrcode';

const USO = 'Uso:\n  npm run admin -- emergencia\n  npm run admin -- agregar <correo> [admin|viewer]';

async function main() {
  const [cmd, email, role = 'admin'] = process.argv.slice(2);
  if (!(cmd === 'emergencia' || (cmd === 'agregar' && email && (role === 'admin' || role === 'viewer')))) {
    console.error(USO);
    process.exit(1);
  }
  process.env.DATABASE_URL ??= 'pglite://./.data/dev';
  const url = process.env.DATABASE_URL!;
  console.log(`Base de datos: ${url.startsWith('pglite://') ? url : `postgres ${new URL(url).host}`}`);
  const { getDb } = await import('@/db/client');
  const { addAllowedUser, resetEmergency } = await import('@/server/auth/emergency');
  const db = getDb();
  await runMigrations(db);

  if (cmd === 'emergencia') {
    const r = await resetEmergency(db);
    console.log(`Usuario:    ${r.username}\nContraseña: ${r.password}\nOTPAuth:    ${r.otpauth}\n`);
    console.log(await QRCode.toString(r.otpauth, { type: 'terminal', small: true }));
    console.log('Guarda estos datos ahora: no se volverán a mostrar.');
  } else {
    const u = await addAllowedUser(db, email, role as 'admin' | 'viewer');
    console.log(`Autorizado: ${u.email} (${u.role})`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
