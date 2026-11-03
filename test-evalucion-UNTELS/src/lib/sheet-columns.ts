import { OTHER_PREFIX } from './answers';
import { LEVEL_LABELS, type SurveyResult } from './scoring';
import type { AnswerValue, Instrument, Question } from './types';

export type SheetColumn = { key: string; header: string };
export type SheetRow = { id: string; respondentName: string; answers: Record<string, AnswerValue>; result: SurveyResult; completedAt: Date };
type Cell = string | number;
type Column = SheetColumn & { value: (r: SheetRow) => Cell };

const LIMA_OFFSET = 5 * 3600_000;
const fecha = (d: Date) => new Date(d.getTime() - LIMA_OFFSET).toISOString().slice(0, 16).replace('T', ' ');

function answerText(q: Question, v: AnswerValue | undefined): Cell {
  if (v === undefined || v === null) return '';
  const label = (id: string) => (id.startsWith(OTHER_PREFIX) ? `Otro: ${id.slice(OTHER_PREFIX.length)}` : q.options.find((o) => o.id === id)?.label ?? '');
  if (Array.isArray(v)) return v.map(label).join('; ');
  if (q.type === 'single-choice' && typeof v === 'string') return label(v);
  return v;
}

/** Columnas actuales del instrumento: claves estables (no cambian si se edita el texto de una pregunta). */
export function sheetColumns(inst: Instrument): Column[] {
  const cols: Column[] = [
    { key: 'id', header: 'ID', value: (r) => r.id },
    { key: 'fecha', header: 'Fecha', value: (r) => fecha(r.completedAt) },
    ...inst.questions.map((q, i): Column => ({
      key: `q:${q.id}`, header: `${i + 1}. ${q.text || 'Pregunta sin texto'}`.slice(0, 200), value: (r) => answerText(q, r.answers[q.id]),
    })),
    { key: 'total', header: 'Puntaje total', value: (r) => r.result.totalScore },
  ];
  if (inst.areas.length && inst.levels.length) {
    for (const a of inst.areas) {
      cols.push({ key: `area:${a.id}`, header: `Nivel ${a.name}`, value: (r) => {
        const x = r.result.areas.find((y) => y.id === a.id);
        return x ? LEVEL_LABELS[x.level] : '';
      } });
    }
    if (inst.careers.length) cols.push({ key: 'carreras', header: 'Carreras recomendadas', value: (r) => r.result.careers.join('; ') });
  }
  return cols;
}

/** Las columnas guardadas no se mueven (las que ya no existen quedan con su encabezado y vacías); las nuevas van al final. */
export function mergeColumns(stored: SheetColumn[], current: Column[]): { layout: SheetColumn[]; byKey: Map<string, Column> } {
  const byKey = new Map(current.map((c) => [c.key, c]));
  const seen = new Set(stored.map((c) => c.key));
  const layout = [
    ...stored.map((s) => ({ key: s.key, header: byKey.get(s.key)?.header ?? s.header })),
    ...current.filter((c) => !seen.has(c.key)).map((c) => ({ key: c.key, header: c.header })),
  ];
  return { layout, byKey };
}
