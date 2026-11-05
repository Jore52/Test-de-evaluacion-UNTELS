'use client';

import { Question } from '@/lib/types';
import { OTHER_PREFIX } from '@/lib/answers';
import ScaleLayout from './ScaleLayout';

// ─── Interactive Question ───

interface QuestionFieldProps {
  question: Question;
  number: number;
  value: unknown;
  onChange: (value: unknown) => void;
  hasError: boolean;
}

export default function QuestionField({ question, number, value, onChange, hasError }: QuestionFieldProps) {
  return (
    <div id={`pregunta-${question.id}`} className={`space-y-3 rounded-xl p-2 sm:p-4 transition-colors ${hasError ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-red-300 dark:ring-red-800' : ''}`}>
      <label className="block text-sm font-medium text-[var(--text)]">
        <span className="text-[var(--muted)] mr-1">{number}.</span>
        {question.text || 'Pregunta sin texto'}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hasError && (
        <p className="text-xs text-red-500">Esta pregunta es obligatoria</p>
      )}

      <div className="sm:pl-5">
        {question.type === 'short-text' && (
          <input
            type="text"
            placeholder="Tu respuesta"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-md border-b border-[var(--border)] bg-transparent py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)] transition-colors"
          />
        )}

        {question.type === 'long-text' && (
          <textarea
            placeholder="Tu respuesta"
            rows={3}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg bg-transparent p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)] resize-none transition-colors"
          />
        )}

        {question.type === 'single-choice' && (
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={value === opt.id}
                  onChange={() => onChange(opt.id)}
                  className="accent-[var(--primary)] h-4 w-4"
                />
                <span className="text-sm text-[var(--text)]">{opt.label}</span>
              </label>
            ))}
            {question.allowOther && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={typeof value === 'string' && value.startsWith(OTHER_PREFIX)}
                  onChange={() => onChange(OTHER_PREFIX)}
                  className="accent-[var(--primary)] h-4 w-4"
                />
                <span className="text-sm text-[var(--muted)] italic">Otro:</span>
                <input
                  type="text"
                  value={typeof value === 'string' && value.startsWith(OTHER_PREFIX) ? value.slice(OTHER_PREFIX.length) : ''}
                  onChange={(e) => onChange(`${OTHER_PREFIX}${e.target.value}`)}
                  className="flex-1 border-b border-[var(--border)] bg-transparent py-0.5 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>
            )}
          </div>
        )}

        {question.type === 'multi-choice' && (
          <div className="space-y-2">
            {question.options.map((opt) => {
              const selected = Array.isArray(value) ? value as string[] : [];
              return (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, opt.id]
                        : selected.filter((id) => id !== opt.id);
                      onChange(next);
                    }}
                    className="accent-[var(--primary)] h-4 w-4 rounded"
                  />
                  <span className="text-sm text-[var(--text)]">{opt.label}</span>
                </label>
              );
            })}
            {question.allowOther && (() => {
              const selected = Array.isArray(value) ? (value as string[]) : [];
              const other = selected.find((v) => v.startsWith(OTHER_PREFIX));
              const rest = selected.filter((v) => !v.startsWith(OTHER_PREFIX));
              return (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={other !== undefined}
                    onChange={(e) => onChange(e.target.checked ? [...rest, OTHER_PREFIX] : rest)}
                    className="accent-[var(--primary)] h-4 w-4 rounded"
                  />
                  <span className="text-sm text-[var(--muted)] italic">Otro:</span>
                  <input
                    type="text"
                    value={other ? other.slice(OTHER_PREFIX.length) : ''}
                    onChange={(e) => onChange([...rest, `${OTHER_PREFIX}${e.target.value}`])}
                    className="flex-1 border-b border-[var(--border)] bg-transparent py-0.5 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>
              );
            })()}
          </div>
        )}

        {(question.type === 'scale' || question.type === 'point-scale') && (() => {
          const { min, max, startLabel, endLabel, pointLabels } = question.scaleConfig;
          const point = question.type === 'point-scale';
          return (
            <ScaleLayout
              wide={point}
              start={point ? undefined : startLabel}
              end={point ? undefined : endLabel}
              items={Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => ({
                key: n,
                top: point && (
                  <span className="text-xs text-[var(--primary)] font-medium text-center leading-tight break-words w-full px-1">
                    {pointLabels[n] || ''}
                  </span>
                ),
                box: (
                  <button
                    type="button"
                    onClick={() => onChange(n)}
                    className={`h-10 w-10 shrink-0 rounded-lg border-2 flex items-center justify-center text-sm transition-colors ${value === n
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]'
                      }`}
                  >
                    {n}
                  </button>
                ),
              }))}
            />
          );
        })()}
      </div>
    </div>
  );
}
