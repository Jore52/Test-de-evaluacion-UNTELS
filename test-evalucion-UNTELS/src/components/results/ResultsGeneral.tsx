'use client';

import { useMemo } from 'react';
import { useInstrument } from '@/context/InstrumentContext';
import { SurveyResponse, Question } from '@/lib/types';
import { QUESTION_TYPE_LABELS } from '@/lib/utils';

interface ResultsGeneralProps {
  responses: SurveyResponse[];
}

export default function ResultsGeneral({ responses }: ResultsGeneralProps) {
  const { instrument } = useInstrument();

  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted)]">No hay respuestas aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--muted)]">
        Resumen de {responses.length} respuesta{responses.length !== 1 ? 's' : ''} por pregunta.
      </p>
      {instrument.questions.map((q, idx) => (
        <QuestionSummary key={q.id} question={q} number={idx + 1} responses={responses} />
      ))}
    </div>
  );
}

function QuestionSummary({ question, number, responses }: { question: Question; number: number; responses: SurveyResponse[] }) {
  const summary = useMemo(() => computeSummary(question, responses), [question, responses]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded">
            P{number}
          </span>
          <span className="text-xs text-[var(--muted)]">{QUESTION_TYPE_LABELS[question.type]}</span>
          <span className="text-xs text-[var(--muted)] ml-auto">
            {summary.answered}/{responses.length} respondieron
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--text)]">{question.text || 'Sin texto'}</p>
      </div>

      {/* Summary content by type */}
      {(question.type === 'single-choice' || question.type === 'multi-choice') && summary.optionCounts && (
        <div className="space-y-2">
          {summary.optionCounts.map((opt) => (
            <div key={opt.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text)]">{opt.label}</span>
                <span className="text-[var(--muted)] text-xs">{opt.count} ({opt.percent}%)</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--background)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${opt.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {(question.type === 'scale' || question.type === 'point-scale') && summary.scaleStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-[var(--background)]">
            <p className="text-2xl font-bold text-[var(--primary)]">{summary.scaleStats.avg}</p>
            <p className="text-xs text-[var(--muted)]">Promedio</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]">
            <p className="text-2xl font-bold text-[var(--text)]">{summary.scaleStats.median}</p>
            <p className="text-xs text-[var(--muted)]">Mediana</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]">
            <p className="text-lg font-semibold text-[var(--text)]">
              {summary.scaleStats.min} – {summary.scaleStats.max}
            </p>
            <p className="text-xs text-[var(--muted)]">Rango</p>
          </div>
          {/* Distribution bars */}
          <div className="col-span-3 space-y-1.5">
            <p className="text-xs font-medium text-[var(--muted)]">Distribución</p>
            <div className="flex items-end gap-1 h-16">
              {summary.scaleStats.distribution.map((d) => (
                <div key={d.value} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-[var(--primary)] transition-all duration-300 min-h-[2px]"
                    style={{ height: `${d.percent}%` }}
                  />
                  <span className="text-[10px] text-[var(--muted)]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(question.type === 'short-text' || question.type === 'long-text') && summary.textAnswers && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {summary.textAnswers.map((text, i) => (
            <div key={i} className="text-sm text-[var(--text)] bg-[var(--background)] rounded-lg px-3 py-2">
              &ldquo;{text}&rdquo;
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary computation ───

interface OptionCount {
  label: string;
  count: number;
  percent: number;
}

interface ScaleStats {
  avg: string;
  median: number;
  min: number;
  max: number;
  distribution: { value: number; count: number; percent: number }[];
}

interface Summary {
  answered: number;
  optionCounts?: OptionCount[];
  scaleStats?: ScaleStats;
  textAnswers?: string[];
}

function computeSummary(question: Question, responses: SurveyResponse[]): Summary {
  const allAnswers = responses.map((r) => r.answers[question.id]).filter((a) => a !== undefined && a !== null && a !== '');
  const answered = allAnswers.length;

  if (question.type === 'single-choice') {
    const counts: Record<string, number> = {};
    for (const opt of question.options) counts[opt.id] = 0;
    for (const a of allAnswers) counts[a as string] = (counts[a as string] || 0) + 1;
    return {
      answered,
      optionCounts: question.options.map((opt) => ({
        label: opt.label,
        count: counts[opt.id] || 0,
        percent: answered > 0 ? Math.round(((counts[opt.id] || 0) / answered) * 100) : 0,
      })),
    };
  }

  if (question.type === 'multi-choice') {
    const counts: Record<string, number> = {};
    for (const opt of question.options) counts[opt.id] = 0;
    for (const a of allAnswers) {
      if (Array.isArray(a)) {
        for (const id of a) counts[id] = (counts[id] || 0) + 1;
      }
    }
    return {
      answered,
      optionCounts: question.options.map((opt) => ({
        label: opt.label,
        count: counts[opt.id] || 0,
        percent: answered > 0 ? Math.round(((counts[opt.id] || 0) / answered) * 100) : 0,
      })),
    };
  }

  if (question.type === 'scale' || question.type === 'point-scale') {
    const nums = allAnswers.filter((a) => typeof a === 'number') as number[];
    if (nums.length === 0) return { answered };
    const sorted = [...nums].sort((a, b) => a - b);
    const avg = (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Distribution
    const dist: Record<number, number> = {};
    for (let v = question.scaleConfig.min; v <= question.scaleConfig.max; v++) dist[v] = 0;
    for (const n of nums) dist[n] = (dist[n] || 0) + 1;
    const maxCount = Math.max(...Object.values(dist), 1);

    return {
      answered,
      scaleStats: {
        avg, median, min, max,
        distribution: Object.entries(dist).map(([v, c]) => ({
          value: Number(v),
          count: c,
          percent: Math.round((c / maxCount) * 100),
        })),
      },
    };
  }

  // Text types
  return {
    answered,
    textAnswers: allAnswers.map((a) => String(a)),
  };
}

