'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { InstrumentProvider, useInstrument } from '@/context/InstrumentContext';
import { useCanManage } from '@/context/UserContext';
import EditorHeader, { type SaveState } from '@/components/editor/EditorHeader';
import InstrumentForm from '@/components/editor/InstrumentForm';
import ConfigPanel from '@/components/editor/config/ConfigPanel';
import ResultsPanel from '@/components/results/ResultsPanel';
import { loadInstrument, saveInstrument, deleteInstrument, duplicateInstrument, publishInstrument } from '@/lib/storage';
import type { Instrument } from '@/lib/types';

type ViewType = 'editor' | 'config' | 'results';

function EditorShell() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Instrument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstrument(id).then(setInitial).catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center text-sm text-red-600">{error}</div>;
  if (!initial) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }
  return (
    <InstrumentProvider key={initial.id} initial={initial}>
      <Editor />
    </InstrumentProvider>
  );
}

function Editor() {
  const router = useRouter();
  const { instrument, dispatch } = useInstrument();
  const { saveState, flush } = useAutoSave(instrument);
  const sheetsReturn = useSearchParams().has('sheets'); // al volver de Google se abre Configuración
  const [view, setView] = useState<ViewType>(sheetsReturn ? 'config' : 'editor');

  const views: { id: ViewType; label: string }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'config', label: 'Configuración' },
    { id: 'results', label: 'Resultados' },
  ];

  const handlePreview = async () => {
    const w = window.open('about:blank', '_blank'); // abrir dentro del clic: si no, el navegador bloquea la ventana
    await flush();
    const url = `/instrumento/${instrument.id}/vista-previa`;
    if (w) w.location.href = url;
    else window.location.href = url;
  };

  const handlePublish = async (publish: boolean) => {
    await flush();
    const doc = await publishInstrument(instrument.id, publish);
    dispatch({ type: 'SET_STATUS', payload: doc.status });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <EditorHeader
        saveState={saveState}
        onPreview={handlePreview}
        onPublish={handlePublish}
        onDuplicate={async () => {
          await flush();
          const copy = await duplicateInstrument(instrument.id);
          router.push(`/instrumento/${copy.id}`);
        }}
        onDelete={async () => {
          if (confirm('¿Estás seguro de eliminar este instrumento? Se borrarán también sus respuestas. Esta acción no se puede deshacer.')) {
            await deleteInstrument(instrument.id);
            router.push('/');
          }
        }}
      />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* View toggle */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === v.id
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {view === 'editor' && (
          <div className="max-w-3xl mx-auto">
            <InstrumentForm />
          </div>
        )}
        {view === 'config' && <ConfigPanel />}
        {view === 'results' && <ResultsPanel />}
      </main>
    </div>
  );
}

/** Guarda en el servidor 800 ms después del último cambio; flush() fuerza el guardado pendiente. */
function useAutoSave(instrument: Instrument) {
  const canManage = useCanManage();
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const first = useRef(true);
  const latest = useRef(instrument);
  const dirty = useRef(false);
  const inflight = useRef<Promise<void>>(Promise.resolve());

  const save = useCallback(() => {
    if (!dirty.current) return inflight.current;
    dirty.current = false;
    setSaveState('saving');
    // encadenado: dos guardados nunca se cruzan y el último gana
    inflight.current = inflight.current.then(() => saveInstrument(latest.current)).then(
      () => setSaveState(dirty.current ? 'saving' : 'saved'),
      () => { dirty.current = true; setSaveState('error'); },
    );
    return inflight.current;
  }, []);

  useEffect(() => {
    latest.current = instrument;
    if (first.current) { first.current = false; return; }
    if (!canManage) return;
    dirty.current = true;
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [instrument, canManage, save]);

  // avisa antes de cerrar con cambios sin guardar
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const flush = useCallback(async () => {
    await save();
    if (dirty.current) throw new Error('No se pudieron guardar los cambios. Revisa tu conexión.');
  }, [save]);

  return { saveState, flush };
}

export default function InstrumentoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" />}>
      <EditorShell />
    </Suspense>
  );
}
