import { adminRoute } from '@/server/admin-route';
import { countResponses, deleteResponses, listResponses } from '@/server/instruments';

type P = { id: string };
// ?count=1: solo el total (la pestaña del editor no necesita cargar todas las respuestas)
export const GET = adminRoute<P>('view', ({ db, params, req }) =>
  new URL(req.url).searchParams.has('count') ? countResponses(db, params.id) : listResponses(db, params.id));
export const DELETE = adminRoute<P>('manage', ({ db, user, params }) => deleteResponses(db, user, params.id));
