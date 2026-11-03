import { handlePost } from '@/server/route-helper';
import { findMine, publishedOrThrow } from '@/server/submissions';

// ¿Este dispositivo ya respondió? Devuelve su respuesta para mostrar el resultado o editarla.
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handlePost(req, ctx, async (db, id, body) => {
    await publishedOrThrow(db, id);
    return { mine: await findMine(db, id, body.deviceToken) };
  });
