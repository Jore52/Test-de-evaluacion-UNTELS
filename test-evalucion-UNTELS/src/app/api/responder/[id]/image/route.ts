import { handlePost } from '@/server/route-helper';
import { PublicError } from '@/server/errors';
import { findMine, publishedOrThrow } from '@/server/submissions';
import { jpegResponse, renderResultJpeg } from '@/server/result-image';

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handlePost(req, ctx, async (db, id, body) => {
    const inst = await publishedOrThrow(db, id);
    const mine = await findMine(db, id, body.deviceToken);
    if (!mine) throw new PublicError('not_found', 'No encontramos tu respuesta.');
    return jpegResponse(await renderResultJpeg({
      title: inst.title, name: mine.name, completedAt: mine.completedAt, result: mine.result, finalMessage: inst.generalConfig.finalMessage,
    }));
  });
