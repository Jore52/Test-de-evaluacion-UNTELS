import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function key(): Buffer {
  const k = Buffer.from(process.env.APP_SECRET ?? '', 'base64');
  if (k.length !== 32) throw new Error('APP_SECRET inválido: debe ser de 32 bytes en base64.');
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv, c.getAuthTag(), ct].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

export function decryptSecret(enc: string): string {
  const parts = enc.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Texto cifrado inválido.');
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const ct = parts[3];
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Texto cifrado inválido.');
  const d = createDecipheriv('aes-256-gcm', key(), iv, { authTagLength: 16 });
  d.setAuthTag(tag);
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
}

const SCRYPT = { N: 16384, r: 8, p: 1 };

function derive(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw, salt, 64, SCRYPT, (e, k) => (e ? rej(e) : res(k))));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${(await derive(pw, salt)).toString('base64url')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const got = await derive(pw, Buffer.from(salt, 'base64url'));
  return got.length === expected.length && timingSafeEqual(got, expected);
}
