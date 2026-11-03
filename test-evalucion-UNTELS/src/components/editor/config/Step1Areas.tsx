'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useInstrument } from '@/context/InstrumentContext';

export default function Step1Areas() {
  const { instrument, dispatch } = useInstrument();
  const [newAreaName, setNewAreaName] = useState('');
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    dispatch({ type: 'ADD_AREA', payload: { name: newAreaName.trim(), color: '' } });
    setNewAreaName('');
  };

  // Get questions already assigned to any area
  const assignedQuestionIds = new Set(instrument.areas.flatMap((a) => a.questionIds));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Áreas de Conocimiento / Inteligencias</h3>
        <p className="text-sm text-[var(--muted)]">
          Agrega las áreas y asocia las preguntas del instrumento a cada una.
        </p>
      </div>

      {/* Add area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
          placeholder="Nombre del área (ej: Lógico-Matemática)"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--muted)]"
        />
        <Button onClick={handleAddArea} icon={<Plus className="h-4 w-4" />} disabled={!newAreaName.trim()}>
          Agregar
        </Button>
      </div>

      {/* Areas list */}
      {instrument.areas.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted)] text-sm">
          No hay áreas agregadas aún.
        </div>
      ) : (
        <div className="space-y-3">
          {instrument.areas.map((area) => {
            const isExpanded = expandedArea === area.id;
            // Available questions for this area: unassigned + already in this area
            const availableQuestions = instrument.questions.filter(
              (q) => !assignedQuestionIds.has(q.id) || area.questionIds.includes(q.id)
            );

            return (
              <div
                key={area.id}
                className="rounded-xl border border-[var(--border)] overflow-hidden"
              >
                {/* Area header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] cursor-pointer hover:bg-[var(--border)]/20 transition-colors"
                  onClick={() => setExpandedArea(isExpanded ? null : area.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                  )}
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <input
                    type="text"
                    value={area.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'UPDATE_AREA', payload: { id: area.id, updates: { name: e.target.value } } });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-sm font-medium text-[var(--text)] outline-none"
                  />
                  <span className="text-xs text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded-full">
                    {area.questionIds.length} preguntas
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'DELETE_AREA', payload: area.id });
                    }}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Expanded: question list */}
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-[var(--border)] space-y-1.5 max-h-60 overflow-y-auto">
                    {availableQuestions.length === 0 ? (
                      <p className="text-sm text-[var(--muted)] italic py-2">
                        No hay preguntas disponibles. Agrega preguntas en el editor.
                      </p>
                    ) : (
                      availableQuestions.map((q) => {
                        const isSelected = area.questionIds.includes(q.id);
                        return (
                          <label
                            key={q.id}
                            className="relative flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface)] cursor-pointer transition-colors"
                          >
                            <div
                              className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[var(--primary)] border-[var(--primary)]'
                                  : 'border-[var(--border)]'
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-[var(--on-primary)]" />}
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                dispatch({
                                  type: 'TOGGLE_QUESTION_AREA',
                                  payload: { areaId: area.id, questionId: q.id },
                                })
                              }
                              className="sr-only"
                            />
                            <span className="text-sm text-[var(--text)] truncate">
                              <span className="text-[var(--muted)] mr-1">P{q.position + 1}.</span>
                              {q.text || 'Pregunta sin texto'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
