import { adminRoute } from '@/server/admin-route';
import { publishInstrument } from '@/server/instruments';

// body: { publish: boolean } — false despublica (el link deja de aceptar respuestas)
export const POST = adminRoute<{ id: string }>('manage', ({ db, user, params, body }) =>
  publishInstrument(db, user, params.id, (body as { publish?: unknown })?.publish !== false));
