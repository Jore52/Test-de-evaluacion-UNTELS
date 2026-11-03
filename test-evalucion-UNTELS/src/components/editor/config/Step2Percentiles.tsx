'use client';

import type { ClipboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { forEachCell, isGrid, parseGrid, toNum } from '@/lib/paste';
import Button from '@/components/ui/Button';
import { useInstrument } from '@/context/InstrumentContext';

export default function Step2Percentiles() {
  const { instrument, dispatch } = useInstrument();
  const { areas, percentiles } = instrument;

  const handleAddColumn = () => {
    dispatch({ type: 'ADD_PERCENTILE_COLUMN', payload: { label: '' } });
  };

  // Pegar bloque de Excel: fila 0 = encabezados, filas 1..n = áreas; se recorta a la tabla
  const pasteAt = (row: number, col: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGrid(text)) return;
    e.preventDefault();
    const next = percentiles.map((c) => ({ ...c, values: { ...c.values } }));
    forEachCell(parseGrid(text), row, col, areas.length + 1, next.length, (r, c, cell) => {
      const n = toNum(cell);
      if (n === null) return;
      if (r === 0) next[c].number = n;
      else next[c].values[areas[r - 1].id] = n;
    });
    dispatch({ type: 'SET_PERCENTILES', payload: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Tabla de Percentiles</h3>
        <p className="text-sm text-[var(--muted)]">
          Define los valores de percentil para cada área. Cada columna tiene un número editable que se usará como referencia en los Niveles.
          Puedes pegar celdas copiadas de Excel (encabezados y valores) desde cualquier casilla.
        </p>
      </div>

      {percentiles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted)] mb-4">No hay columnas de percentil aún.</p>
          <Button onClick={handleAddColumn} icon={<Plus className="h-4 w-4" />}>
            Agregar columna
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-[var(--muted)] px-3 py-2 border-b border-[var(--border)] min-w-[160px]">
                  Área
                </th>
                {percentiles.map((col, index) => (
                  <th key={col.id} className="px-2 py-2 border-b border-[var(--border)] min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        {/* Label: PC [correlativo] - [número editable] */}
                        <span className="text-xs font-semibold text-[var(--primary)] whitespace-nowrap">
                          PC {index + 1} -
                        </span>
                        <input
                          type="number"
                          value={col.number}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_PERCENTILE_NUMBER',
                              payload: { columnId: col.id, number: parseFloat(e.target.value) || 0 },
                            })
                          }
                          onPaste={pasteAt(0, index)}
                          className="w-14 bg-transparent text-sm font-bold text-[var(--text)] outline-none text-center border-b-2 border-[var(--primary)]/30 hover:border-[var(--primary)]/60 focus:border-[var(--primary)] transition-colors"
                          title="Número de percentil"
                        />
                        <button
                          onClick={() => dispatch({ type: 'DELETE_PERCENTILE_COLUMN', payload: col.id })}
                          className="p-0.5 rounded text-[var(--muted)] hover:text-red-500 shrink-0"
                          title="Eliminar columna"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 border-b border-[var(--border)] w-12">
                  <button
                    onClick={handleAddColumn}
                    className="p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
                    title="Agregar columna"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area, areaIndex) => (
                <tr key={area.id} className="hover:bg-[var(--surface)] transition-colors">
                  <td className="px-3 py-2 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: area.color }}
                      />
                      <span className="text-sm text-[var(--text)]">{area.name}</span>
                    </div>
                  </td>
                  {percentiles.map((col, colIndex) => (
                    <td key={col.id} className="px-2 py-2 border-b border-[var(--border)]">
                      <input
                        type="number"
                        value={col.values[area.id] ?? 0}
                        onChange={(e) =>
                          dispatch({
                            type: 'UPDATE_PERCENTILE_VALUE',
                            payload: {
                              columnId: col.id,
                              areaId: area.id,
                              value: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        onPaste={pasteAt(areaIndex + 1, colIndex)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text)] text-center outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                      />
                    </td>
                  ))}
                  <td className="border-b border-[var(--border)]" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
