'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Eye, Monitor, Smartphone, RefreshCw } from 'lucide-react';
import SurveyRunner, { type Done } from '@/components/survey/SurveyRunner';
import UntelsBanner from '@/components/layout/UntelsBanner';
import { loadInstrument } from '@/lib/storage';
import { computeResult } from '@/lib/scoring';
import type { AnswerValue, Instrument } from '@/lib/types';

function Preview() {
  const { id } = useParams<{ id: string }>();
  const embed = useSearchParams().get('embed') === '1'; // dentro del marco del celular
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [inst, setInst] = useState<Instrument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0); // cambia la key para reiniciar

  const reload = useCallback(() => {
    loadInstrument(id).then((i) => { setInst(i); setRun((n) => n + 1); }).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  const onSubmit = useCallback(async (answers: Record<string, AnswerValue>): Promise<Done> =>
    ({ name: '', answers, result: computeResult(inst!, answers) }), [inst]);
  const getImage = useCallback(async (done: Done) => {
    const res = await fetch(`/api/instruments/${encodeURIComponent(id)}/preview-image`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: done.name, answers: done.answers }),
    });
    if (!res.ok) throw new Error('No se pudo generar la imagen.');
    return res.blob();
  }, [id]);

  const body = error ? (
    <p className="py-20 text-center text-sm text-red-600">{error}</p>
  ) : !inst ? (
    <div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /></div>
  ) : (
    <SurveyRunner key={run} instrument={inst} onSubmit={onSubmit} getImage={getImage} onRestart={() => {}} />
  );

  if (embed) {
    return <main className="min-h-screen bg-[var(--surface)]"><UntelsBanner /><div className="px-3 py-4"><div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">{body}</div></div></main>;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Eye className="h-4 w-4 text-[var(--primary)] shrink-0" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--muted)]">Vista previa — Las respuestas no se guardarán</span>
          <button onClick={reload} title="Recargar cambios del editor" className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]">
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5" role="group" aria-label="Dispositivo">
            {([['desktop', Monitor, 'Escritorio'], ['mobile', Smartphone, 'Móvil']] as const).map(([d, Icon, label]) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${device === d ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {device === 'desktop' ? (
        <main>
          <UntelsBanner />
          <div className="px-3 py-4 sm:p-8">
          <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 sm:p-8 shadow-sm">{body}</div>
          </div>
        </main>
      ) : (
        <main className="flex justify-center py-8 px-4">
          {/* iframe: así aplican los breakpoints reales de un celular de 390 px */}
          <div className="rounded-[2.5rem] border-[10px] border-slate-800 dark:border-slate-600 shadow-2xl overflow-hidden bg-[var(--background)]">
            <iframe
              key={run}
              src={`/instrumento/${encodeURIComponent(id)}/vista-previa?embed=1`}
              title="Vista previa en celular"
              className="block w-[390px] max-w-[calc(100vw-60px)] h-[844px] max-h-[calc(100vh-160px)]"
            />
          </div>
        </main>
      )}
    </div>
  );
}

export default function VistaPreviaPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" />}><Preview /></Suspense>;
}
