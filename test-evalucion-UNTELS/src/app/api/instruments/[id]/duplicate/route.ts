import { adminRoute } from '@/server/admin-route';
import { duplicateInstrument } from '@/server/instruments';

export const POST = adminRoute<{ id: string }>('manage', ({ db, user, params }) => duplicateInstrument(db, user, params.id));
