import { eq } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import sharp from 'sharp';
import type { Db } from '@/db/client';
import type * as schema from '@/db/schema';
import { images } from '@/db/schema';
import { PublicError } from './errors';
import type { AdminUser } from './auth/types';

const q = (db: Db) => db as PgliteDatabase<typeof schema>;
const MAX = 700_000; // caracteres del data URL (~500 KB de imagen)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATS: Record<string, string> = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };

/** Guarda una imagen subida por el panel. Se decodifica con sharp: solo entra lo que realmente es webp/jpeg/png. */
export async function saveImage(db: Db, user: AdminUser, body: unknown): Promise<{ url: string }> {
  const dataUrl = (body as { dataUrl?: unknown } | null)?.dataUrl;
  const m = typeof dataUrl === 'string' && dataUrl.length <= MAX ? /^data:image\/(?:webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!m) throw new PublicError('invalid', 'Imagen inválida o demasiado grande.');
  const buf = Buffer.from(m[1], 'base64');
  const format = await sharp(buf).metadata().then((x) => x.format, () => undefined);
  const mime = format && FORMATS[format];
  if (!mime) throw new PublicError('invalid', 'El archivo no es una imagen válida.');
  const [row] = await q(db).insert(images).values({ mime, data: buf.toString('base64'), createdBy: user.email }).returning({ id: images.id });
  return { url: `/api/images/${row.id}` };
}

export async function loadImage(db: Db, id: string): Promise<{ mime: string; data: Buffer } | null> {
  if (!UUID.test(id)) return null;
  const [r] = await q(db).select({ mime: images.mime, data: images.data }).from(images).where(eq(images.id, id));
  return r ? { mime: r.mime, data: Buffer.from(r.data, 'base64') } : null;
}
