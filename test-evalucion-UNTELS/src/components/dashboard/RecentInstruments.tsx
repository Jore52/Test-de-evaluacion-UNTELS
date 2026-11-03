'use client';

import { Clock } from 'lucide-react';
import { Instrument } from '@/lib/types';

interface RecentInstrumentsProps {
  instruments: Instrument[];
  onSelect: (id: string) => void;
}

export default function RecentInstruments({ instruments, onSelect }: RecentInstrumentsProps) {
  if (instruments.length === 0) return null;

  const recent = instruments.slice(0, 4);

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      <Clock className="h-4 w-4 text-[var(--muted)] shrink-0" />
      {recent.map((inst) => (
        <button
          key={inst.id}
          onClick={() => onSelect(inst.id)}
          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] transition-colors"
        >
          {inst.title}
        </button>
      ))}
    </div>
  );
}
