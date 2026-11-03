'use client';

import { createContext, useContext } from 'react';
import type { AdminUser } from '@/server/auth/types';

const UserContext = createContext<AdminUser | null>(null);

export function UserProvider({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
export const useCanManage = () => useContext(UserContext)?.role !== 'viewer';
