import { after } from 'next/server';
import { getDb } from '@/db/client';
import { handlePost } from '@/server/route-helper';
import { submit } from '@/server/submissions';
import { syncIfLinked } from '@/server/sheets/link';

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handlePost(req, ctx, async (db, id, body) => {
    const r = await submit(db, id, body);
    // la respuesta ya está en la base; Sheets se escribe después de contestar al encuestado
    if (!r.already) after(() => syncIfLinked(getDb(), id));
    return r;
  });
