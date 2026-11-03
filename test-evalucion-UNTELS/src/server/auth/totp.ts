import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32encode(buf: Buffer): string {
  let bits = 0, val = 0, out = '';
  for (const b of buf) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31];
  return out;
}

function b32decode(s: string): Buffer {
  let bits = 0, val = 0;
  const out: number[] = [];
  for (const ch of s.toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('Secreto base32 inválido.');
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newTotpSecret = (): string => b32encode(randomBytes(20));

export function totpAt(secretB32: string, unixSeconds: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(unixSeconds / 30)));
  const h = createHmac('sha1', b32decode(secretB32)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/** Paso (ventana de 30 s) que coincide con el código, o null. */
export function matchTotpStep(secretB32: string, code: string, unixSeconds: number, window = 1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  let hit: number | null = null;
  for (let w = -window; w <= window; w++) {
    const exp = Buffer.from(totpAt(secretB32, unixSeconds + w * 30));
    if (timingSafeEqual(exp, Buffer.from(code))) hit = Math.floor(unixSeconds / 30) + w;
  }
  return hit;
}

export const verifyTotp = (secretB32: string, code: string, unixSeconds: number, window = 1): boolean =>
  matchTotpStep(secretB32, code, unixSeconds, window) !== null;

export function otpauthUri(secretB32: string, account: string, issuer = 'Instrumentos'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
