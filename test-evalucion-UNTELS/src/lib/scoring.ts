import type { AnswerValue, Instrument, Question } from './types';

export type Level = 'low' | 'mid' | 'high';
export const LEVEL_ORDER: Record<Level, number> = { low: 0, mid: 1, high: 2 };
export const LEVEL_LABELS: Record<Level, string> = { low: 'Bajo', mid: 'Medio', high: 'Alto' };

export interface AreaResult {
  id: string;
  name: string;
  color: string;
  score: number;
  percentile: number | null; // null si el instrumento no tiene tabla de percentiles
  level: Level;
}

export interface SurveyResult {
  isTest: boolean;
  totalScore: number;
  areas: AreaResult[];
  careers: string[];
}

export const isTest = (inst: Instrument) => inst.areas.length > 0 && inst.levels.length > 0;

export function questionPoints(q: Question, answer: AnswerValue | undefined): number {
  if (q.type === 'scale' || q.type === 'point-scale') return typeof answer === 'number' ? answer : 0;
  if (q.type === 'single-choice') return q.options.find((o) => o.id === answer)?.points ?? 0;
  if (q.type === 'multi-choice' && Array.isArray(answer)) {
    return answer.reduce((s, id) => s + (q.options.find((o) => o.id === id)?.points ?? 0), 0);
  }
  return 0;
}

/** Mayor percentil cuyo puntaje de corte es <= al puntaje bruto (0 si no alcanza ninguno). */
export function percentileFor(inst: Instrument, areaId: string, raw: number): number | null {
  if (inst.percentiles.length === 0) return null;
  let best = 0;
  for (const col of inst.percentiles) {
    const cut = col.values[areaId];
    if (typeof cut === 'number' && raw >= cut && col.number > best) best = col.number;
  }
  return best;
}

/** Nivel por el inicio de cada rango: tolera huecos entre rangos (un valor entre Medio y Alto queda en Medio). */
export function levelFor(range: { low: [number, number]; mid: [number, number]; high: [number, number] } | undefined, v: number): Level {
  if (!range) return 'low';
  if (v >= range.high[0]) return 'high';
  if (v >= range.mid[0]) return 'mid';
  return 'low';
}

export function computeResult(inst: Instrument, answers: Record<string, AnswerValue>): SurveyResult {
  const raw: Record<string, number> = {};
  let totalScore = 0;
  for (const q of inst.questions) {
    const pts = questionPoints(q, answers[q.id]);
    totalScore += pts;
    // el editor (Paso 1) asigna preguntas vía Area.questionIds; q.areaId queda por compatibilidad
    const area = inst.areas.find((a) => a.questionIds.includes(q.id)) ?? inst.areas.find((a) => a.id === q.areaId);
    if (area) raw[area.id] = (raw[area.id] ?? 0) + pts;
  }

  const areas: AreaResult[] = inst.areas.map((a) => {
    const score = raw[a.id] ?? 0;
    const percentile = percentileFor(inst, a.id, score);
    const level = levelFor(inst.levels.find((l) => l.areaId === a.id), percentile ?? score);
    return { id: a.id, name: a.name, color: a.color, score, percentile, level };
  });
  const levelOf = Object.fromEntries(areas.map((a) => [a.id, a.level]));

  const careers = inst.careers.filter((c) => {
    const reqs = Object.entries(c.requirements).filter(([, l]) => !!l);
    return reqs.length > 0 && reqs.every(([areaId, l]) => LEVEL_ORDER[levelOf[areaId] ?? 'low'] >= LEVEL_ORDER[l]);
  }).map((c) => c.name);

  return { isTest: isTest(inst), totalScore, areas, careers };
}
