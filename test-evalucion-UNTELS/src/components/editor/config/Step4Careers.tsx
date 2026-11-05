'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useInstrument } from '@/context/InstrumentContext';

const LEVEL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'low', label: 'Bajo' },
  { value: 'mid', label: 'Medio' },
  { value: 'high', label: 'Alto' },
];

const LEVEL_COLORS: Record<string, string> = {
  low: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20',
  mid: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20',
  high: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
};

export default function Step4Careers() {
  const { instrument, dispatch } = useInstrument();
  const { areas, careers } = instrument;
  const [newCareerName, setNewCareerName] = useState('');

  const handleAddCareer = () => {
    if (!newCareerName.trim()) return;
    dispatch({ type: 'ADD_CAREER', payload: { name: newCareerName.trim() } });
    setNewCareerName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Carreras Recomendadas</h3>
        <p className="text-sm text-[var(--muted)]">
          Agrega carreras y selecciona el nivel requerido de cada área para recomendarla.
        </p>
      </div>

      {/* Add career */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCareerName}
          onChange={(e) => setNewCareerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCareer()}
          placeholder="Nombre de la carrera (ej: Ing. de Sistemas)"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--muted)]"
        />
        <Button onClick={handleAddCareer} icon={<Plus className="h-4 w-4" />} disabled={!newCareerName.trim()}>
          Agregar
        </Button>
      </div>

      {/* Careers table */}
      {careers.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted)] text-sm">
          No hay carreras agregadas aún. Este paso es opcional.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-[var(--muted)] px-3 py-2 border-b border-[var(--border)] min-w-[180px]">
                  Carrera
                </th>
                {areas.map((area) => (
                  <th key={area.id} className="text-center text-sm font-medium px-2 py-2 border-b border-[var(--border)] min-w-[110px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: area.color }}
                      />
                      <span className="text-[var(--text)] truncate">{area.name}</span>
                    </div>
                  </th>
                ))}
                <th className="w-12 border-b border-[var(--border)]" />
              </tr>
            </thead>
            <tbody>
              {careers.map((career) => (
                <tr key={career.id} className="hover:bg-[var(--surface)] transition-colors">
                  <td className="px-3 py-3 border-b border-[var(--border)] align-top space-y-1.5">
                    <span className="block text-sm font-medium text-[var(--text)]">{career.name}</span>
                    <textarea
                      aria-label={`Descripción de ${career.name}`}
                      value={career.description ?? ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_CAREER_DESCRIPTION', payload: { careerId: career.id, description: e.target.value } })}
                      placeholder="Descripción (hasta 3 líneas, se muestra en el resultado)"
                      rows={3}
                      className="w-full min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 resize-y placeholder:text-[var(--muted)]"
                    />
                  </td>
                  {areas.map((area) => {
                    const currentLevel = career.requirements[area.id] || '';
                    return (
                      <td key={area.id} className="px-2 py-3 border-b border-[var(--border)]">
                        <select
                          value={currentLevel}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_CAREER_REQUIREMENT',
                              payload: {
                                careerId: career.id,
                                areaId: area.id,
                                level: e.target.value as 'low' | 'mid' | 'high' | '',
                              },
                            })
                          }
                          className={`w-full appearance-none rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm text-center outline-none cursor-pointer focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-colors ${
                            currentLevel ? LEVEL_COLORS[currentLevel] : 'bg-[var(--background)] text-[var(--muted)]'
                          }`}
                        >
                          {LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 border-b border-[var(--border)]">
                    <button
                      onClick={() => dispatch({ type: 'DELETE_CAREER', payload: career.id })}
                      className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Eliminar carrera"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Example hint */}
      {careers.length > 0 && areas.length > 0 && (
        <div className="rounded-lg bg-[var(--primary-soft)] p-4 text-sm text-[var(--text)]">
          <p className="font-medium mb-1">💡 Ejemplo:</p>
          <p className="text-[var(--muted)]">
            Si seleccionas &ldquo;Alto&rdquo; en Lógico-Matemática e Inteligencia Espacial para &ldquo;Ing. de Sistemas&rdquo;,
            se recomendará esta carrera a estudiantes que alcancen nivel alto en ambas áreas.
          </p>
        </div>
      )}
    </div>
  );
}
