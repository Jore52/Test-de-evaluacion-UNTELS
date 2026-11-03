import { adminRoute } from '@/server/admin-route';
import { createInstrument, listInstruments } from '@/server/instruments';

export const GET = adminRoute('view', ({ db }) => listInstruments(db));
export const POST = adminRoute('manage', ({ db, user }) => createInstrument(db, user));
