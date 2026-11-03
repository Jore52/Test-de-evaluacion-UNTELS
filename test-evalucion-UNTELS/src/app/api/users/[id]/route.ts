import { adminRoute } from '@/server/admin-route';
import { updateUser } from '@/server/admin/users';

export const PATCH = adminRoute<{ id: string }>('manage', async ({ db, user, params, body }) => {
  const b = body as { role?: unknown; active?: unknown };
  await updateUser(db, user, params.id, {
    role: b.role === 'admin' || b.role === 'viewer' ? b.role : undefined,
    active: typeof b.active === 'boolean' ? b.active : undefined,
  });
});
