import { adminRoute } from '@/server/admin-route';
import { listResponses } from '@/server/instruments';

export const GET = adminRoute<{ id: string }>('view', ({ db, params }) => listResponses(db, params.id));
