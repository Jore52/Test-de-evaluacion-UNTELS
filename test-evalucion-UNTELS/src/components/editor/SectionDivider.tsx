'use client';

import { useState } from 'react';
import { Scissors, X, Trash2, MessageSquare } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';

interface SectionDividerProps {
  /** Index of the question ABOVE this divider (i.e., break happens after this question) */
  afterIndex: number;
  /** Whether a section break is already active at this position */
  isActive: boolean;
}

export default function SectionDivider({ afterIndex, isActive }: SectionDividerProps) {
  const { instrument, dispatch } = useInstrument();
  const [hovered, setHovered] = useState(false);
  const [showMessageCard, setShowMessageCard] = useState(false);

  // Find the section message for this break position
  const sectionMessage = instrument.sectionMessages?.find((m) => m.afterIndex === afterIndex);
  const messageText = sectionMessage?.text ?? '';
  const hasMessage = messageText.trim().length > 0;

  if (isActive) {
    // Show active section break with toggleable message textarea
    const sectionNumber = afterIndex + 2; // section after break = question index + 2 (1-based)
    return (
      <div className="space-y-0">
        {/* Section break indicator */}
        <div className="relative flex items-center justify-center py-2 group">
          <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-[var(--primary)]/40" />

          {/* Left: Message icon toggle */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
            <button
              type="button"
              onClick={() => setShowMessageCard((prev) => !prev)}
              className={`flex items-center justify-center h-6 w-6 rounded-md border transition-all shadow-sm ${
                hasMessage
                  ? 'bg-[var(--primary-soft)] border-[var(--primary)]/50 text-[var(--primary)] hover:brightness-105'
                  : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--muted)]'
              }`}
              title={
                hasMessage
                  ? (showMessageCard ? 'Ocultar mensaje intermedio' : 'Ver / editar mensaje intermedio')
                  : (showMessageCard ? 'Ocultar mensaje intermedio' : 'Agregar mensaje intermedio')
              }
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Center: Section pill badge */}
          <div className="relative flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-soft)] border border-[var(--primary)]/30 text-xs font-medium text-[var(--primary)] z-10">
            <Scissors className="h-3 w-3" />
            <span>Sección {sectionNumber}</span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_SECTION_BREAK', payload: afterIndex })}
              className="p-0.5 rounded-full hover:bg-[var(--primary)]/20 transition-colors"
              title="Quitar división"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Intermediate message textarea (collapsible) */}
        {showMessageCard && (
          <div className="mx-4 mt-1 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-3 group/msg hover:border-[var(--primary)]/40 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className={`h-3 w-3 ${hasMessage ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`} />
                <span className="text-xs font-medium text-[var(--muted)]">Mensaje intermedio</span>
                {messageText && (
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_SECTION_MESSAGE', payload: afterIndex })}
                    className="ml-auto p-0.5 rounded text-[var(--muted)] hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all"
                    title="Borrar mensaje"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <textarea
                value={messageText}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_SECTION_MESSAGE',
                    payload: { afterIndex, text: e.target.value },
                  })
                }
                placeholder="Escribe un mensaje para el encuestado entre secciones (opcional)"
                rows={2}
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none resize-none placeholder:text-[var(--muted)]/60"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hover-activated divider
  return (
    <div
      className="relative h-4 flex items-center justify-center cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => dispatch({ type: 'ADD_SECTION_BREAK', payload: afterIndex })}
    >
      <div
        className={`absolute inset-x-0 top-1/2 border-t transition-all duration-200 ${
          hovered
            ? 'border-[var(--primary)]/60 border-dashed'
            : 'border-transparent'
        }`}
      />
      {hovered && (
        <div className="relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] shadow-sm animate-in fade-in zoom-in-95 duration-150">
          <Scissors className="h-3 w-3" />
          <span>Dividir sección aquí</span>
        </div>
      )}
    </div>
  );
}

