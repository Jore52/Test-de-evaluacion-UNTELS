import { adminRoute } from '@/server/admin-route';
import { PublicError } from '@/server/errors';
import { getSheetStatus, setDashboard, syncNow, unlinkSheet } from '@/server/sheets/link';

type P = { id: string };
export const GET = adminRoute<P>('manage', ({ db, params }) => getSheetStatus(db, params.id));
// body: { action: 'unlink' | 'sync' | 'dashboard', on?: boolean }
export const POST = adminRoute<P>('manage', async ({ db, user, params, body }) => {
  const b = body as { action?: unknown; on?: unknown };
  if (b.action === 'unlink') await unlinkSheet(db, user, params.id);
  else if (b.action === 'sync') await syncNow(db, user, params.id);
  else if (b.action === 'dashboard') await setDashboard(db, user, params.id, b.on === true);
  else throw new PublicError('invalid', 'Acción no válida.');
  return getSheetStatus(db, params.id);
});
