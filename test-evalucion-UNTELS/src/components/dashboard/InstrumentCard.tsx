'use client';

import { FileText, Clock } from 'lucide-react';
import Card from '@/components/ui/Card';
import { Instrument } from '@/lib/types';
import { formatDate, truncate } from '@/lib/utils';

interface InstrumentCardProps {
  instrument: Instrument;
  onClick: () => void;
}

export default function InstrumentCard({ instrument, onClick }: InstrumentCardProps) {
  return (
    <Card hover onClick={onClick}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-semibold text-[var(--text)] line-clamp-1">{instrument.title}</h3>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              instrument.status === 'published'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {instrument.status === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        </div>

        {instrument.description && (
          <p className="text-sm text-[var(--muted)] line-clamp-2">
            {truncate(instrument.description, 120)}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(instrument.updatedAt)}</span>
          </div>
          <span>{instrument.questions.length} preguntas</span>
        </div>
      </div>
    </Card>
  );
}
