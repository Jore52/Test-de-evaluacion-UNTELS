import { adminRoute } from '@/server/admin-route';
import { saveImage } from '@/server/images';

export const POST = adminRoute('manage', ({ db, user, body }) => saveImage(db, user, body));
