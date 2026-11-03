import type { AnswerValue, Instrument, Question } from './types';

export const OTHER_PREFIX = '__other:';
const MAX_TEXT = 5000;

const isEmpty = (v: AnswerValue | undefined) =>
  v === undefined || v === null || v === '' || v === OTHER_PREFIX || (Array.isArray(v) && v.length === 0);

/** Normaliza una respuesta contra la pregunta; devuelve undefined si no es válida para su tipo. */
function clean(q: Question, v: unknown): AnswerValue | undefined {
  const ids = new Set(q.options.map((o) => o.id));
  const other = (s: unknown) => q.allowOther && typeof s === 'string' && s.startsWith(OTHER_PREFIX);
  switch (q.type) {
    case 'short-text':
    case 'long-text':
      return typeof v === 'string' ? v.slice(0, MAX_TEXT) : undefined;
    case 'single-choice':
      if (typeof v === 'string' && (ids.has(v) || other(v))) return v.slice(0, MAX_TEXT);
      return undefined;
    case 'multi-choice': {
      if (!Array.isArray(v)) return undefined;
      const out = [...new Set(v.filter((x): x is string => typeof x === 'string' && x !== OTHER_PREFIX && (ids.has(x) || other(x))))];
      return out.map((x) => x.slice(0, MAX_TEXT));
    }
    case 'scale':
    case 'point-scale': {
      const { min, max } = q.scaleConfig;
      return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
    }
  }
}

/** Respuestas limpias, o la lista de preguntas obligatorias sin responder. */
export function validateAnswers(inst: Instrument, raw: unknown): { answers: Record<string, AnswerValue>; missing: string[] } {
  const src = (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const answers: Record<string, AnswerValue> = {};
  const missing: string[] = [];
  for (const q of inst.questions) {
    const v = clean(q, src[q.id]);
    if (!isEmpty(v)) answers[q.id] = v!;
    else if (q.required) missing.push(q.id);
  }
  return { answers, missing };
}

export const isAnswerEmpty = isEmpty;
