import { adminRoute } from '@/server/admin-route';
import { deleteResponses } from '@/server/instruments';

export const DELETE = adminRoute<{ id: string; responseId: string }>('manage', ({ db, user, params }) =>
  deleteResponses(db, user, params.id, params.responseId));
