import { Suspense, type ReactNode } from 'react';
import { requireUser } from '@/server/auth/current-user';
import { UserProvider } from '@/context/UserContext';

async function Guard({ children }: { children: ReactNode }) {
  const user = await requireUser('view');
  return <UserProvider user={user}>{children}</UserProvider>;
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" />}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
