'use client';

import { useMemo } from 'react';
import { useInstrument } from '@/context/InstrumentContext';
import { SurveyResponse } from '@/lib/types';
import { Users, Award, TrendingUp, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import { LEVEL_LABELS, type Level } from '@/lib/scoring';

interface ResultsDashboardProps {
  responses: SurveyResponse[];
}

export default function ResultsDashboard({ responses }: ResultsDashboardProps) {
  const { instrument } = useInstrument();

  const stats = useMemo(() => {
    if (responses.length === 0) return null;

    const scores = responses.map((r) => r.totalScore).filter((s): s is number => s !== null);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Completion rate (% of questions answered per response)
    const completionRates = responses.map((r) => {
      const answered = instrument.questions.filter((q) => {
        const a = r.answers[q.id];
        return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
      }).length;
      return instrument.questions.length > 0 ? (answered / instrument.questions.length) * 100 : 0;
    });
    const avgCompletion = completionRates.length > 0
      ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
      : 0;

    // Responses by day
    const byDay: Record<string, number> = {};
    for (const r of responses) {
      const day = new Date(r.submittedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // Score distribution (buckets)
    const buckets = [
      { label: '0-25%', count: 0, color: 'bg-red-400' },
      { label: '25-50%', count: 0, color: 'bg-amber-400' },
      { label: '50-75%', count: 0, color: 'bg-blue-400' },
      { label: '75-100%', count: 0, color: 'bg-emerald-400' },
    ];
    if (maxScore > 0) {
      for (const s of scores) {
        const pct = (s / maxScore) * 100;
        if (pct <= 25) buckets[0].count++;
        else if (pct <= 50) buckets[1].count++;
        else if (pct <= 75) buckets[2].count++;
        else buckets[3].count++;
      }
    }

    // Niveles por área y carreras: salen del resultado guardado de cada respuesta
    const levels = instrument.areas.map((a) => {
      const count: Record<Level, number> = { low: 0, mid: 0, high: 0 };
      for (const r of responses) {
        const l = r.result?.areas.find((x) => x.id === a.id)?.level;
        if (l) count[l]++;
      }
      return { area: a, count };
    });
    const careers: Record<string, number> = {};
    for (const r of responses) for (const c of r.result?.careers ?? []) careers[c] = (careers[c] || 0) + 1;
    const topCareers = Object.entries(careers).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return { avgScore, maxScore, minScore, avgCompletion, byDay, buckets, scores, levels, topCareers };
  }, [responses, instrument.questions, instrument.areas]);

  if (!stats || responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted)]">No hay datos suficientes para mostrar el dashboard.</p>
      </div>
    );
  }

  const maxByDay = Math.max(...Object.values(stats.byDay), 1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Total Respuestas"
          value={String(responses.length)}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-100 dark:bg-blue-900/30"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Tasa Finalización"
          value={`${stats.avgCompletion}%`}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <MetricCard
          icon={<Award className="h-5 w-5" />}
          label="Puntaje Promedio"
          value={stats.avgScore}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-100 dark:bg-amber-900/30"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Rango de Puntajes"
          value={`${stats.minScore} – ${stats.maxScore}`}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Responses per day */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--muted)]" />
            <h4 className="text-sm font-semibold text-[var(--text)]">Respuestas por Día</h4>
          </div>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(stats.byDay).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-[var(--text)]">{count}</span>
                <div
                  className="w-full rounded-t-md bg-[var(--primary)] transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(count / maxByDay) * 100}%` }}
                />
                <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score distribution */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[var(--muted)]" />
            <h4 className="text-sm font-semibold text-[var(--text)]">Distribución de Puntajes</h4>
          </div>
          <div className="space-y-3">
            {stats.buckets.map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text)]">{bucket.label}</span>
                  <span className="text-[var(--muted)] text-xs">
                    {bucket.count} ({stats.scores.length > 0 ? Math.round((bucket.count / stats.scores.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--background)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bucket.color} transition-all duration-500`}
                    style={{ width: `${stats.scores.length > 0 ? (bucket.count / stats.scores.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.levels.length > 0 && instrument.levels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--muted)]" />
              <h4 className="text-sm font-semibold text-[var(--text)]">Niveles por Área</h4>
            </div>
            <div className="space-y-3">
              {stats.levels.map(({ area, count }) => {
                const total = count.low + count.mid + count.high;
                return (
                  <div key={area.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-[var(--text)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                        {area.name}
                      </span>
                      <span className="text-[var(--muted)] text-xs">
                        {(['low', 'mid', 'high'] as const).map((l) => `${LEVEL_LABELS[l]} ${count[l]}`).join(' · ')}
                      </span>
                    </div>
                    <div className="flex h-2.5 rounded-full bg-[var(--background)] overflow-hidden">
                      {total > 0 && (['low', 'mid', 'high'] as const).map((l) => (
                        <div
                          key={l}
                          title={`${LEVEL_LABELS[l]}: ${count[l]}`}
                          className={`h-full ${l === 'low' ? 'bg-amber-400' : l === 'mid' ? 'bg-blue-400' : 'bg-emerald-400'}`}
                          style={{ width: `${(count[l] / total) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--muted)]" />
              <h4 className="text-sm font-semibold text-[var(--text)]">Carreras más recomendadas</h4>
            </div>
            {stats.topCareers.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aún no hay carreras recomendadas.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topCareers.map(([name, n]) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text)]">{name}</span>
                    <span className="text-[var(--muted)] text-xs">{n} ({Math.round((n / responses.length) * 100)}%)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Recent responses table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[var(--text)]">Últimas Respuestas</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 text-[var(--muted)] font-medium">Encuestado</th>
                <th className="text-center py-2 px-3 text-[var(--muted)] font-medium">Puntaje</th>
                <th className="text-right py-2 px-3 text-[var(--muted)] font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {responses.slice(0, 8).map((r, idx) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-semibold shrink-0">
                        {r.respondentName ? r.respondentName.charAt(0) : `#`}
                      </div>
                      <span className="text-[var(--text)]">{r.respondentName || `Anónimo #${idx + 1}`}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-semibold text-[var(--text)]">{r.totalScore ?? '—'}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-[var(--muted)]">
                    {new Date(r.submittedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

