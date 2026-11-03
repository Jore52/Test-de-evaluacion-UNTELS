'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useCanManage, useUser } from '@/context/UserContext';

export default function UserMenu() {
  const user = useUser();
  const canManage = useCanManage();
  const name = user?.name || user?.email || '';
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full p-1 hover:bg-[var(--surface)] transition-colors"
        >
          <Avatar src={user?.picture} name={name} size="sm" />
          <span className="text-sm font-medium text-[var(--text)] hidden md:block">
            {name}
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--text)]">{name}</p>
            <p className="text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
          {canManage && (
            <Link href="/usuarios" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
              <Settings className="h-4 w-4" />
              Usuarios autorizados
            </Link>
          )}
          <form action="/api/auth/logout" method="post">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--surface)] transition-colors">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
