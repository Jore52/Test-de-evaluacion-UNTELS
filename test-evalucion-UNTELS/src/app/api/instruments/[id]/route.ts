import { adminRoute } from '@/server/admin-route';
import { deleteInstrument, getInstrument, saveInstrument } from '@/server/instruments';

type P = { id: string };
export const GET = adminRoute<P>('view', ({ db, params }) => getInstrument(db, params.id));
export const PUT = adminRoute<P>('manage', ({ db, params, body }) => saveInstrument(db, params.id, body));
export const DELETE = adminRoute<P>('manage', ({ db, user, params }) => deleteInstrument(db, user, params.id));
