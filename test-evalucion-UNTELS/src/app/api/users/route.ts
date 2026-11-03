import { adminRoute } from '@/server/admin-route';
import { addUser, listUsers } from '@/server/admin/users';

export const GET = adminRoute('manage', ({ db, user }) => listUsers(db, user));
export const POST = adminRoute('manage', async ({ db, user, body }) => {
  const b = body as { email?: unknown; role?: unknown };
  await addUser(db, user, { email: String(b.email ?? ''), role: b.role === 'viewer' ? 'viewer' : 'admin' });
});
