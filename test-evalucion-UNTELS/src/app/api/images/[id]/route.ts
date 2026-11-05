import { connection } from 'next/server';
import { getDb } from '@/db/client';
import { loadImage } from '@/server/images';

// Público: el encuestado ve la portada y la publicidad. Cada subida crea un id nuevo, así que se cachea para siempre.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection(); // lee la BD en cada solicitud (cacheComponents)
  const img = await loadImage(getDb(), (await ctx.params).id);
  if (!img) return new Response('No encontrado', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { 'content-type': img.mime, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
  });
}
