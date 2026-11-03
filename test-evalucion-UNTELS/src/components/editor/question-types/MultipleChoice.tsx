'use client';

import { Plus, X } from 'lucide-react';
import { Option } from '@/lib/types';

interface MultipleChoiceProps {
  options: Option[];
  allowOther: boolean;
  showScoring: boolean;
  onOptionsChange: (options: Option[]) => void;
  onAllowOtherChange: (allowOther: boolean) => void;
}

export default function MultipleChoice({
  options,
  allowOther,
  showScoring,
  onOptionsChange,
  onAllowOtherChange,
}: MultipleChoiceProps) {
  const addOption = () => {
    const newOption: Option = {
      id: crypto.randomUUID(),
      label: `Opción ${options.length + 1}`,
      points: options.length,
    };
    onOptionsChange([...options, newOption]);
  };

  const updateOption = (id: string, label: string) => {
    onOptionsChange(options.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const updatePoints = (id: string, points: number) => {
    onOptionsChange(options.map((o) => (o.id === id ? { ...o, points } : o)));
  };

  const removeOption = (id: string) => {
    onOptionsChange(options.filter((o) => o.id !== id));
  };

  const autoAssignPoints = () => {
    onOptionsChange(options.map((o, i) => ({ ...o, points: i })));
  };

  return (
    <div className="space-y-3">
      {showScoring && options.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Puntuación por opción</span>
          <button
            onClick={autoAssignPoints}
            className="text-xs text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
          >
            Auto-asignar (0, 1, 2...)
          </button>
        </div>
      )}

      {options.map((option) => (
        <div key={option.id} className="flex items-center gap-3 group">
          <div className="h-4 w-4 rounded border-2 border-[var(--border)] shrink-0" />
          <input
            type="text"
            value={option.label}
            onChange={(e) => updateOption(option.id, e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] transition-colors pb-0.5"
          />
          {showScoring && (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={option.points}
                onChange={(e) => updatePoints(option.id, parseInt(e.target.value) || 0)}
                className="w-14 rounded-md border border-[var(--border)] bg-[var(--primary-soft)] px-2 py-1 text-xs text-center text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                title="Puntos"
              />
              <span className="text-xs text-[var(--muted)]">pts</span>
            </div>
          )}
          {options.length > 1 && (
            <button
              onClick={() => removeOption(option.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted)] hover:text-red-500 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {allowOther && (
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded border-2 border-dashed border-[var(--border)] shrink-0" />
          <span className="text-sm text-[var(--muted)] italic">Otro...</span>
          {showScoring && <span className="text-xs text-[var(--muted)] ml-auto mr-6">0 pts</span>}
          <button
            onClick={() => onAllowOtherChange(false)}
            className="p-1 rounded text-[var(--muted)] hover:text-red-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={addOption}
          className="flex items-center gap-2 text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar opción
        </button>
        {!allowOther && (
          <>
            <span className="text-[var(--muted)]">o</span>
            <button
              onClick={() => onAllowOtherChange(true)}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
            >
              agregar &quot;Otro&quot;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
