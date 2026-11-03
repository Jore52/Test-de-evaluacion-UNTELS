'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Eye,
  Send,
  MoreVertical,
  Copy,
  Trash2,
  Check,
  EyeOff,
  Link2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import PublishInfo from '@/components/editor/PublishInfo';
import { useInstrument } from '@/context/InstrumentContext';

export type SaveState = 'saving' | 'saved' | 'error';

interface EditorHeaderProps {
  saveState: SaveState;
  onPreview: () => Promise<void>;
  onPublish: (publish: boolean) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const SAVE_LABEL: Record<SaveState, { text: string; dot: string }> = {
  saving: { text: 'Guardando…', dot: 'bg-amber-500' },
  saved: { text: 'Guardado', dot: 'bg-emerald-500' },
  error: { text: 'Sin guardar', dot: 'bg-red-500' },
};

// los errores de red/servidor se muestran al usuario en vez de perderse
const run = (fn: () => Promise<void>) => () => { fn().catch((e: Error) => alert(e.message)); };

export default function EditorHeader({ saveState, onPreview, onPublish, onDuplicate, onDelete }: EditorHeaderProps) {
  const router = useRouter();
  const { instrument, dispatch, canUndo, canRedo } = useInstrument();
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState(false);
  const [showPublishInfo, setShowPublishInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const publishRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (publishRef.current && !publishRef.current.contains(e.target as Node)) {
        setShowPublishInfo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (instrument.questions.length === 0) {
      alert('Agrega al menos una pregunta antes de publicar.');
      return;
    }
    if (!instrument.title.trim()) {
      alert('El instrumento necesita un título.');
      return;
    }
    setPublishing(true);
    try {
      await onPublish(true); // republicar actualiza lo que ven los encuestados
      setPublishFeedback(true);
      setTimeout(() => setPublishFeedback(false), 2000);
      setShowPublishInfo(true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        {/* Left: Back + Title */}
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <input
          type="text"
          value={instrument.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-base font-semibold text-[var(--text)] outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] transition-colors px-1 py-0.5 truncate"
          placeholder="Título del instrumento"
        />

        {/* Auto-save indicator */}
        <span className="text-xs text-[var(--muted)] hidden sm:flex items-center gap-1 shrink-0" aria-live="polite">
          <div className={`h-1.5 w-1.5 rounded-full ${SAVE_LABEL[saveState].dot}`} />
          {SAVE_LABEL[saveState].text}
        </span>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-[var(--border)] mx-1" />

          <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={run(onPreview)}>
            <span className="hidden sm:inline">Vista previa</span>
          </Button>

          {/* Publish button + floating PublishInfo popover */}
          <div className="relative flex items-center gap-1" ref={publishRef}>
            {/* ya publicado: el enlace se abre a pedido, sin republicar ni tapar las pestañas */}
            {instrument.status === 'published' && (
              <Button variant="secondary" size="sm" icon={<Link2 className="h-4 w-4" />} onClick={() => setShowPublishInfo((v) => !v)} title="Enlace y QR">
                <span className="hidden sm:inline">Enlace</span>
              </Button>
            )}
            <Button
              size="sm"
              icon={publishFeedback ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              onClick={handlePublish}
              disabled={publishing}
            >
              <span className="hidden sm:inline">
                {publishFeedback ? '¡Listo!' : instrument.status === 'published' ? 'Actualizar publicación' : 'Publicar'}
              </span>
            </Button>

            {showPublishInfo && (instrument.status === 'published' || publishFeedback) && (
              <div className="absolute right-0 top-full mt-2 w-[min(50vw,480px)] min-w-[320px] z-50">
                <PublishInfo
                  instrumentId={instrument.id}
                  onClose={() => setShowPublishInfo(false)}
                />
              </div>
            )}
          </div>

          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <Button variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    run(onDuplicate)();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar instrumento
                </button>
                {instrument.status === 'published' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm('¿Despublicar? El enlace dejará de aceptar respuestas (las ya recibidas se conservan).')) {
                        setShowPublishInfo(false);
                        run(() => onPublish(false))();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <EyeOff className="h-4 w-4" />
                    Despublicar
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    run(onDelete)();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--surface)] transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar instrumento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
