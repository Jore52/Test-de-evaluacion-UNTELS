'use client';

import { useState } from 'react';
import { useInstrument } from '@/context/InstrumentContext';
import { useCanManage } from '@/context/UserContext';
import { SurveyResponse } from '@/lib/types';
import { respondentLabel } from '@/lib/sheet-columns';
import { deleteResponses } from '@/lib/storage';
import SearchBar from '@/components/ui/SearchBar';
import { User, Clock, Hash, Trash2 } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@/lib/utils';

interface ResultsIndividualProps {
  responses: SurveyResponse[];
  onDeleted: () => void;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ResultsIndividual({ responses, onDeleted }: ResultsIndividualProps) {
  const { instrument } = useInstrument();
  const canManage = useCanManage();
  const [selectedId, setSelectedId] = useState<string | null>(
    responses.length > 0 ? responses[0].id : null
  );
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);

  // #n fijo por respuesta: no cambia al filtrar
  const rows = responses.map((r, idx) => {
    const label = respondentLabel(instrument, r);
    return { r, n: idx + 1, label, name: label || `Anónimo #${idx + 1}` };
  });
  const visible = search ? rows.filter((x) => fold(x.name).includes(fold(search.trim()))) : rows;
  const selectedRow = rows.find((x) => x.r.id === selectedId) ?? visible[0];
  const selected = selectedRow?.r;

  const handleDelete = async () => {
    if (!selectedRow || !confirm(`¿Eliminar la respuesta de "${selectedRow.name}"? No se puede deshacer (si hay hoja de Google vinculada, la fila ya enviada se mantiene allí).`)) return;
    setDeleting(true);
    try {
      await deleteResponses(instrument.id, selectedRow.r.id);
      setSelectedId(null);
      onDeleted();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

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
        <div className="mb-3">
          <SearchBar placeholder="Buscar encuestado..." value={search} onChange={setSearch} />
        </div>
        <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 px-2">
          Encuestados ({search ? `${visible.length}/${responses.length}` : responses.length})
        </h4>
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {visible.length === 0 && <p className="text-sm text-[var(--muted)] px-2">Sin coincidencias.</p>}
          {visible.map(({ r, n, label, name }) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selected?.id === r.id
                  ? 'bg-[var(--primary-soft)] border border-[var(--primary)]/30'
                  : 'hover:bg-[var(--surface)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  selected?.id === r.id
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'bg-[var(--surface)] text-[var(--muted)]'
                }`}>
                  {label ? label.charAt(0).toUpperCase() : `#${n}`}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {name}
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
        {selected && selectedRow ? (
          <div className="space-y-6">
            {/* Respondent header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-sm font-bold">
                  {selectedRow.label ? selectedRow.label.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    {selectedRow.name}
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
              {canManage && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Eliminando…' : 'Eliminar respuesta'}
                </button>
              )}
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

