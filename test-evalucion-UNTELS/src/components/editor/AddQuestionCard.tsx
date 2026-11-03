'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';
import { parseGrid } from '@/lib/paste';

export default function AddQuestionCard() {
  const { dispatch } = useInstrument();

  // Ctrl+V fuera de un campo de texto: una pregunta por fila copiada de Excel
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const texts = parseGrid(e.clipboardData?.getData('text/plain') ?? '')
        .map((row) => row.find((c) => c.trim())?.trim())
        .filter((t): t is string => !!t);
      if (!texts.length) return;
      e.preventDefault();
      dispatch({ type: 'ADD_QUESTIONS', payload: texts });
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [dispatch]);

  return (
    <button
      onClick={() => dispatch({ type: 'ADD_QUESTION' })}
      className="w-full rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--background)] p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-all group cursor-pointer"
    >
      <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
        <Plus className="h-6 w-6 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
      </div>
      <span className="text-sm font-medium text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">
        Agregar pregunta
      </span>
      <span className="text-xs text-[var(--muted)]">o pega preguntas copiadas de Excel (Ctrl+V)</span>
    </button>
  );
}
