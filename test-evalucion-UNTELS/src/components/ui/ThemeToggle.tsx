'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // false en el servidor y en la hidratación, true después: el tema solo se conoce en el navegador
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
      aria-label="Cambiar tema"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
