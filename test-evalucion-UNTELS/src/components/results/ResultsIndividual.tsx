'use client';

import { useState } from 'react';
import { useInstrument } from '@/context/InstrumentContext';
import { SurveyResponse } from '@/lib/types';
import { User, Clock, Hash } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@/lib/utils';

interface ResultsIndividualProps {
  responses: SurveyResponse[];
}

export default function ResultsIndividual({ responses }: ResultsIndividualProps) {
  const { instrument } = useInstrument();
  const [selectedId, setSelectedId] = useState<string | null>(
    responses.length > 0 ? responses[0].id : null
  );

  const selected = responses.find((r) => r.id === selectedId);

  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted)]">No hay respuestas aún.</p>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getAnswerDisplay = (questionId: string, answer: unknown): string => {
    const q = instrument.questions.find((q) => q.id === questionId);
    if (!q || answer === null || answer === undefined) return '—';

    switch (q.type) {
      case 'short-text':
      case 'long-text':
        return String(answer);
      case 'single-choice': {
        const opt = q.options.find((o) => o.id === answer);
        return opt ? opt.label : String(answer);
      }
      case 'multi-choice': {
        if (!Array.isArray(answer)) return String(answer);
        return (answer as string[])
          .map((id) => {
            const opt = q.options.find((o) => o.id === id);
            return opt ? opt.label : id;
          })
          .join(', ');
      }
      case 'scale':
      case 'point-scale':
        return String(answer);
      default:
        return String(answer);
    }
  };

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Respondent list */}
      <div className="lg:w-72 shrink-0">
        <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 px-2">
          Encuestados ({responses.length})
        </h4>
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {responses.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selectedId === r.id
                  ? 'bg-[var(--primary-soft)] border border-[var(--primary)]/30'
                  : 'hover:bg-[var(--surface)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  selectedId === r.id
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'bg-[var(--surface)] text-[var(--muted)]'
                }`}>
                  {r.respondentName ? r.respondentName.charAt(0).toUpperCase() : `#${idx + 1}`}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {r.respondentName || `Anónimo #${idx + 1}`}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(r.submittedAt)}</p>
                </div>
                {r.totalScore !== null && (
                  <span className="ml-auto text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-1.5 py-0.5 rounded shrink-0">
                    {r.totalScore}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Response detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="space-y-6">
            {/* Respondent header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-sm font-bold">
                  {selected.respondentName ? selected.respondentName.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    {selected.respondentName || 'Anónimo'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(selected.submittedAt)}
                    </span>
                    {selected.totalScore !== null && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Puntaje: {selected.totalScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-4">
              {instrument.questions.map((q, idx) => (
                <div key={q.id} className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)] mb-1">
                    Pregunta {idx + 1} · {QUESTION_TYPE_LABELS[q.type]}
                  </p>
                  <p className="text-sm font-medium text-[var(--text)] mb-2">{q.text || 'Sin texto'}</p>
                  <p className="text-sm text-[var(--text)]">
                    {getAnswerDisplay(q.id, selected.answers[q.id])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="h-8 w-8 text-[var(--muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--muted)]">Selecciona un encuestado para ver sus respuestas</p>
          </div>
        )}
      </div>
    </div>
  );
}

