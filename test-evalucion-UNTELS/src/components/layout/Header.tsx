'use client';

import Image from 'next/image';
import SearchBar from '@/components/ui/SearchBar';
import UserMenu from './UserMenu';

interface HeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export default function Header({ searchValue = '', onSearchChange, showSearch = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Izquierda */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/file.svg" alt="" width={36} height={36} priority className="h-9 w-9" />
          <h1 className="text-lg font-bold text-[var(--text)] hidden sm:block">
            Instrumentos de Evaluación
          </h1>
        </div>

        {/* Centro */}
        {showSearch && onSearchChange && (
          <div className="flex-1 flex justify-center">
            <SearchBar
              placeholder="Buscar instrumentos por nombre..."
              value={searchValue}
              onChange={onSearchChange}
            />
          </div>
        )}

        {/* Derecha */}
        <div className="shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
