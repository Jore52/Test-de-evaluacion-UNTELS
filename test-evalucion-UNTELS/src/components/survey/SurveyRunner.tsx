'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Send, CheckCircle2, PlayCircle, GraduationCap, Trophy, Download, Share2, RotateCcw } from 'lucide-react';
import type { AnswerValue, Instrument, Question } from '@/lib/types';
import { rankCareers, type SurveyResult } from '@/lib/scoring';
import { isAnswerEmpty } from '@/lib/answers';
import { shareOrDownload } from '@/lib/share';
import { textOn } from '@/lib/image';
import Button from '@/components/ui/Button';
import QuestionField from './QuestionField';
import AdCarousel from './AdCarousel';

export interface Done { name: string; answers: Record<string, AnswerValue>; result: SurveyResult; already?: boolean }

interface SurveyRunnerProps {
  instrument: Instrument;
  /** Guarda (o calcula, en vista previa) y devuelve el resultado. */
  onSubmit: (answers: Record<string, AnswerValue>) => Promise<Done>;
  /** Imagen JPG del resultado. */
  getImage: (done: Done) => Promise<Blob>;
  /** Respuesta previa del dispositivo. */
  previous?: Done | null;
  /** Vista previa: permite reiniciar. */
  onRestart?: () => void;
}

export default function SurveyRunner({ instrument, onSubmit, getImage, previous, onRestart }: SurveyRunnerProps) {
  const single = instrument.generalConfig.singleResponse;
  const [done, setDone] = useState<Done | null>(single && previous ? { ...previous, already: true } : null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(previous?.answers ?? {});
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [showingMessage, setShowingMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const breaks = useMemo(() => [...instrument.sectionBreaks].sort((a, b) => a - b), [instrument.sectionBreaks]);
  const sections = useMemo(() => {
    if (instrument.questions.length === 0) return [];
    const result: Question[][] = [];
    let start = 0;
    for (const b of breaks) {
      result.push(instrument.questions.slice(start, b + 1));
      start = b + 1;
    }
    result.push(instrument.questions.slice(start));
    return result.filter((s) => s.length > 0);
  }, [instrument.questions, breaks]);

  const hasSections = sections.length > 1;
  const currentQuestions = hasSections ? sections[currentSection] || [] : instrument.questions;
  const isLastSection = !hasSections || currentSection === sections.length - 1;
  const isFirstSection = currentSection === 0;

  const getMessageForSection = (idx: number): string => {
    if (!hasSections || idx === 0) return '';
    const msg = instrument.sectionMessages?.find((m) => m.afterIndex === breaks[idx - 1]);
    return msg?.text?.trim() ?? '';
  };
  const transitionMessage = getMessageForSection(currentSection);
  const globalOffset = hasSections ? sections.slice(0, currentSection).reduce((sum, s) => sum + s.length, 0) : 0;

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value as AnswerValue }));
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const validateCurrentSection = (): boolean => {
    const newErrors = new Set<string>();
    for (const q of currentQuestions) {
      const a = answers[q.id];
      const empty = Array.isArray(a) ? a.filter((x) => !isAnswerEmpty(x)).length === 0 : isAnswerEmpty(a);
      if (q.required && empty) newErrors.add(q.id);
    }
    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleSubmit = async () => {
    setSending(true);
    setSendError(null);
    try {
      setDone(await onSubmit(answers));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSendError((e as Error).message || 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleNext = () => {
    if (showingMessage) {
      setShowingMessage(false);
      return;
    }
    if (!validateCurrentSection()) return;
    if (isLastSection) {
      handleSubmit();
    } else {
      const next = currentSection + 1;
      setCurrentSection(next);
      if (getMessageForSection(next)) setShowingMessage(true);
      window.scrollTo({ top: 0 });
    }
  };

  const handlePrev = () => {
    if (showingMessage) {
      setShowingMessage(false);
      setCurrentSection((s) => s - 1);
      return;
    }
    if (!isFirstSection) setCurrentSection((s) => s - 1);
  };

  const restart = () => {
    setDone(null);
    setAnswers({});
    setCurrentSection(0);
    setErrors(new Set());
    setShowingMessage(false);
    setStarted(false);
    onRestart?.();
  };

  if (done) {
    return (
      <ResultScreen
        instrument={instrument}
        done={done}
        getImage={getImage}
        onRestart={onRestart ? restart : undefined}
        onEdit={!single ? () => { setDone(null); setStarted(true); setCurrentSection(0); } : undefined}
      />
    );
  }

  if (!started) {
    const cover = instrument.generalConfig.cover;
    const img = cover?.desktop;
    const textColor = img ? textOn(cover.overlayColor) : undefined;
    return (
      <div className="text-center space-y-6 pb-6">
        {/* con imagen, la misma proporción del recorte (4:5 móvil, 3:1 escritorio); min-h-min hace que crezca si el texto es largo (overflow-hidden anula ese mínimo) */}
        <div className={`relative overflow-hidden rounded-xl flex items-center justify-center p-4 sm:p-8 ${img ? (cover.mobile ? 'aspect-[4/5]' : 'aspect-[3/1]') + ' sm:aspect-[3/1] min-h-min' : 'min-h-[55vh] sm:min-h-[280px]'}`}>
          {img && (
            <picture>
              {cover.mobile && <source media="(max-width: 639px)" srcSet={cover.mobile} />}
              <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </picture>
          )}
          <div
            className={`relative space-y-3 max-w-md ${img ? (cover.showText ? 'rounded-xl px-5 py-4' : 'sr-only') : ''}`}
            style={img && cover.showText ? { backgroundColor: `color-mix(in srgb, ${cover.overlayColor} ${Math.round(cover.overlayOpacity * 100)}%, transparent)`, color: textColor } : undefined}
          >
            <h1 className={`text-2xl font-bold ${img ? '' : 'text-[var(--text)]'}`}>{instrument.title || 'Sin título'}</h1>
            {instrument.description && (
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${img ? 'opacity-90' : 'text-[var(--muted)]'}`}>{instrument.description}</p>
            )}
          </div>
        </div>
        {previous && !single && (
          <p className="text-sm text-[var(--primary)]">Ya respondiste. Puedes revisar y modificar tus respuestas.</p>
        )}
        <div className="flex justify-center">
          <Button onClick={() => setStarted(true)} icon={<PlayCircle className="h-4 w-4" />}>
            {previous && !single ? 'Modificar respuestas' : 'Comenzar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasSections && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Sección {currentSection + 1} de {sections.length}</span>
            <span>{Math.round(((currentSection + 1) / sections.length) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <hr className="border-[var(--border)]" />

      {showingMessage ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] py-8 space-y-8 text-center">
          <div className="max-w-md">
            <p className="text-base text-[var(--text)] whitespace-pre-wrap leading-relaxed">{transitionMessage}</p>
          </div>
          <div className="flex items-center justify-between w-full pt-2 gap-3">
            <Button variant="secondary" onClick={handlePrev} icon={<ChevronLeft className="h-4 w-4" />}>Anterior</Button>
            <Button onClick={handleNext} icon={<ChevronRight className="h-4 w-4" />}>Continuar</Button>
          </div>
        </div>
      ) : (
        <>
          {currentQuestions.length === 0 ? (
            <p className="text-center text-[var(--muted)] py-8">No hay preguntas en este instrumento.</p>
          ) : (
            <div className="space-y-6">
              {currentQuestions.map((q, idx) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  number={globalOffset + idx + 1}
                  value={answers[q.id]}
                  onChange={(val) => setAnswer(q.id, val)}
                  hasError={errors.has(q.id)}
                />
              ))}
            </div>
          )}

          {sendError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{sendError}</p>
          )}

          {currentQuestions.length > 0 && (
            <div className="flex items-center justify-between pt-4 gap-3">
              {hasSections && !isFirstSection ? (
                <Button variant="secondary" onClick={handlePrev} icon={<ChevronLeft className="h-4 w-4" />}>Anterior</Button>
              ) : (
                <div />
              )}
              <Button
                onClick={handleNext}
                disabled={sending}
                icon={isLastSection ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              >
                {isLastSection ? (sending ? 'Enviando…' : 'Enviar respuestas') : 'Siguiente'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Resultado final ───

function ResultScreen({ instrument, done, getImage, onRestart, onEdit }: {
  instrument: Instrument;
  done: Done;
  getImage: (done: Done) => Promise<Blob>;
  onRestart?: () => void;
  onEdit?: () => void;
}) {
  const { result } = done;
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const filename = `resultado-${(done.name || 'encuesta').toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.jpg`;

  // la imagen se pide al mostrar el resultado: en iOS, share() falla si entre el clic y la llamada hay una espera de red
  const image = useRef<Promise<Blob> | null>(null);
  useEffect(() => {
    const p = getImage(done);
    p.catch(() => {}); // el error se muestra al pulsar un botón
    image.current = p;
  }, [done, getImage]);

  const withImage = async (kind: 'download' | 'share') => {
    setBusy(kind);
    setImgError(null);
    try {
      const blob = await (image.current ?? getImage(done)).catch(() => (image.current = getImage(done)));
      if (kind === 'share') {
        await shareOrDownload(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: filename }).click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) {
      setImgError((e as Error).message || 'No se pudo generar la imagen.');
    } finally {
      setBusy(null);
    }
  };

  const careers = result.isTest ? rankCareers(instrument, result.areas) : [];
  const [top, ...rest] = careers;
  const ads = instrument.generalConfig.resultImages ?? [];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="inline-flex items-center justify-center gap-1.5 text-lg sm:text-xl font-bold text-[var(--text)]">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {instrument.generalConfig.finalTitle || (result.isTest ? '¡Test completado!' : '¡Respuestas enviadas!')}
        </h2>
        {done.name && <p className="text-sm font-semibold text-[var(--primary)]">{done.name}</p>}
        {done.already && <p className="text-xs sm:text-sm text-[var(--primary)]">Ya habías respondido este instrumento. Este es tu resultado.</p>}
        <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mx-auto whitespace-pre-wrap">
          {instrument.generalConfig.finalMessage || (result.isTest ? 'Estas son las carreras más afines a tu perfil.' : '¡Gracias por completar el instrumento!')}
        </p>
      </div>

      {top && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">Carreras recomendadas</h3>
          </div>

          <div className="rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-3 space-y-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
              <Trophy className="h-3.5 w-3.5" /> Carrera más recomendada según tu perfil
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base sm:text-lg font-bold leading-tight text-[var(--text)]">{top.name}</p>
              <span className="text-base font-bold tabular-nums text-[var(--primary)]">{top.match}%</span>
            </div>
            <MatchBar match={top.match} strong />
            {top.description && <Description text={top.description} className="text-[var(--text)]" />}
          </div>

          {rest.length > 0 && (
            <ol className="space-y-1.5">
              {rest.map((c, i) => (
                <li key={c.id} className="flex gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[11px] font-bold text-[var(--muted)]">{i + 2}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold leading-tight text-[var(--text)]">{c.name}</p>
                      <span className="text-xs font-semibold tabular-nums text-[var(--text)]">{c.match}%</span>
                    </div>
                    <MatchBar match={c.match} />
                    {c.description && <Description text={c.description} className="text-[var(--muted)]" />}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {imgError && <p role="alert" className="text-center text-sm text-red-600">{imgError}</p>}

      <div className="pt-1 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={() => withImage('download')} disabled={busy !== null} icon={<Download className="h-4 w-4" />}>
          {busy === 'download' ? 'Generando…' : 'Descargar JPG'}
        </Button>
        <Button onClick={() => withImage('share')} disabled={busy !== null} icon={<Share2 className="h-4 w-4" />}>
          {busy === 'share' ? 'Generando…' : 'Compartir'}
        </Button>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit}>Modificar respuestas</Button>
        )}
        {onRestart && (
          <Button variant="ghost" onClick={onRestart} icon={<RotateCcw className="h-4 w-4" />}>Reiniciar vista previa</Button>
        )}
      </div>

      <AdCarousel images={ads} />
    </div>
  );
}

function MatchBar({ match, strong }: { match: number; strong?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-valuenow={match} aria-valuemin={0} aria-valuemax={100} aria-label="Afinidad">
      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${match}%`, opacity: strong ? 1 : 0.75 }} />
    </div>
  );
}

/** En móvil corta a 3 líneas (así caben varias carreras en pantalla); en escritorio se ve completa. */
function Description({ text, className }: { text: string; className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className={`text-xs leading-snug whitespace-pre-wrap ${open ? '' : 'line-clamp-3'} sm:line-clamp-none ${className}`}>{text}</p>
      {text.length > 120 && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="sm:hidden mt-0.5 text-[11px] font-medium text-[var(--primary)]">
          {open ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}
