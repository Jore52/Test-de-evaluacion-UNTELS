'use client';

import { useInstrument } from '@/context/InstrumentContext';
import { useEffect, type ClipboardEvent } from 'react';
import { LevelRange } from '@/lib/types';
import { forEachCell, isGrid, parseGrid, toNum } from '@/lib/paste';

const LEVEL_KEYS = ['low', 'mid', 'high'] as const;

export default function Step3Levels() {
  const { instrument, dispatch } = useInstrument();
  const { areas, levels, percentiles } = instrument;

  // Initialize levels for new areas
  useEffect(() => {
    if (areas.length > levels.length) {
      dispatch({ type: 'INIT_LEVELS' });
    }
  }, [areas.length, levels.length, dispatch]);

  // Get sorted percentile numbers for hint display
  const getPercentileNumbers = () => {
    const numbers = percentiles
      .map((col) => col.number)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    return [...new Set(numbers)]; // unique sorted values
  };

  const percentileNumbers = getPercentileNumbers();

  const updateLevelField = (
    areaId: string,
    levelName: 'low' | 'mid' | 'high',
    index: 0 | 1,
    value: number
  ) => {
    const existing = levels.find((l) => l.areaId === areaId);
    if (!existing) return;
    const updated: LevelRange = {
      ...existing,
      [levelName]: [
        index === 0 ? value : existing[levelName][0],
        index === 1 ? value : existing[levelName][1],
      ] as [number, number],
    };
    dispatch({ type: 'UPDATE_LEVEL', payload: updated });
  };

  // Pegar bloque de Excel: filas = áreas visibles, columnas = Bajo min/max, Medio min/max, Alto min/max
  const rowLevels = areas.map((a) => levels.find((l) => l.areaId === a.id)).filter((l): l is LevelRange => !!l);
  const pasteAt = (row: number, col: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGrid(text)) return;
    e.preventDefault();
    const edited = new Map(rowLevels.map((l) => [l.areaId, { ...l, low: [...l.low], mid: [...l.mid], high: [...l.high] } as LevelRange]));
    forEachCell(parseGrid(text), row, col, rowLevels.length, 6, (r, c, cell) => {
      const n = toNum(cell);
      if (n !== null) edited.get(rowLevels[r].areaId)![LEVEL_KEYS[c >> 1]][c & 1] = n;
    });
    dispatch({ type: 'SET_LEVELS', payload: levels.map((l) => edited.get(l.areaId) ?? l) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Niveles por Área</h3>
        <p className="text-sm text-[var(--muted)]">
          Define los rangos para cada nivel (Bajo, Medio, Alto) por área, basándote en los números de percentil configurados.
          Puedes pegar celdas copiadas de Excel desde cualquier casilla.
        </p>
        {percentileNumbers.length > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--muted)]">Percentiles definidos:</span>
            {percentileNumbers.map((num) => (
              <span
                key={num}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-soft)] text-[var(--primary)]"
              >
                {num}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-[var(--muted)] px-3 py-2 border-b border-[var(--border)] min-w-[160px]">
                Área
              </th>
              <th className="text-center text-sm font-medium px-3 py-2 border-b border-[var(--border)] min-w-[140px]">
                <span className="text-amber-600 dark:text-amber-400">Nivel Bajo</span>
              </th>
              <th className="text-center text-sm font-medium px-3 py-2 border-b border-[var(--border)] min-w-[140px]">
                <span className="text-blue-600 dark:text-blue-400">Nivel Medio</span>
              </th>
              <th className="text-center text-sm font-medium px-3 py-2 border-b border-[var(--border)] min-w-[140px]">
                <span className="text-emerald-600 dark:text-emerald-400">Nivel Alto</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => {
              const level = levels.find((l) => l.areaId === area.id);

              if (!level) return null;
              const row = rowLevels.indexOf(level);

              return (
                <tr key={area.id} className="hover:bg-[var(--surface)] transition-colors">
                  <td className="px-3 py-3 border-b border-[var(--border)]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="text-sm font-medium text-[var(--text)]">{area.name}</span>
                      </div>
                      {percentileNumbers.length > 0 && (
                        <span className="text-xs text-[var(--muted)] ml-4.5">
                          PC: {percentileNumbers.join(', ')}
                        </span>
                      )}
                    </div>
                  </td>
                  {LEVEL_KEYS.map((levelName, li) => (
                    <td key={levelName} className="px-3 py-3 border-b border-[var(--border)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          value={level[levelName][0]}
                          onChange={(e) =>
                            updateLevelField(area.id, levelName, 0, parseFloat(e.target.value) || 0)
                          }
                          onPaste={pasteAt(row, li * 2)}
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text)] text-center outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                        />
                        <span className="text-[var(--muted)] text-sm">–</span>
                        <input
                          type="number"
                          value={level[levelName][1]}
                          onChange={(e) =>
                            updateLevelField(area.id, levelName, 1, parseFloat(e.target.value) || 0)
                          }
                          onPaste={pasteAt(row, li * 2 + 1)}
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text)] text-center outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
