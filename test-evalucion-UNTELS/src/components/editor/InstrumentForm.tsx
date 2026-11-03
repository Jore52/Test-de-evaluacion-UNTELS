'use client';

import { Hash, Scissors, X } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';
import QuestionCard from './QuestionCard';
import AddQuestionCard from './AddQuestionCard';
import SectionDivider from './SectionDivider';

export default function InstrumentForm() {
  const { instrument, dispatch } = useInstrument();
  const showScoring = instrument.generalConfig.scoringMode; // se guarda con el instrumento: sobrevive a cambios de pestaña y recargas

  const hasSections = instrument.sectionBreaks.length > 0;

  // Calculate total max score
  const totalMaxScore = instrument.questions.reduce((sum, q) => {
    switch (q.type) {
      case 'single-choice':
        return sum + (q.options.length > 0 ? Math.max(...q.options.map((o) => o.points)) : 0);
      case 'multi-choice':
        return sum + q.options.reduce((s, o) => s + o.points, 0);
      case 'scale':
      case 'point-scale':
        return sum + q.scaleConfig.max;
      default:
        return sum;
    }
  }, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <input
          type="text"
          value={instrument.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
          placeholder="Título del instrumento"
          className="w-full bg-transparent text-2xl font-bold text-[var(--text)] outline-none border-b-2 border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] transition-colors pb-2 placeholder:text-[var(--muted)]"
        />
      </div>

      {/* Description */}
      <div>
        <textarea
          value={instrument.description}
          onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
          placeholder="Descripción del instrumento (opcional)"
          rows={3}
          className="w-full bg-transparent text-sm text-[var(--text)] outline-none border border-[var(--border)] rounded-lg p-3 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors resize-y placeholder:text-[var(--muted)]"
        />
      </div>

      {/* Scoring toggle + Section controls */}
      {instrument.questions.length > 0 && (
        <div className="flex items-center justify-between bg-[var(--background)] rounded-xl border border-[var(--border)] px-4 py-3 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => dispatch({ type: 'UPDATE_GENERAL_CONFIG', payload: { scoringMode: !showScoring } })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showScoring
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Hash className="h-4 w-4" />
              Modo puntuación
            </button>
            {showScoring && (
              <span className="text-sm text-[var(--muted)]">
                Puntaje máximo total: <strong className="text-[var(--text)]">{totalMaxScore}</strong>
              </span>
            )}

            {/* Section controls */}
            {instrument.questions.length > 1 && (
              <>
                <div className="h-4 w-px bg-[var(--border)]" />
                {!hasSections ? (
                  <button
                    onClick={() => dispatch({ type: 'SET_ALL_SECTION_BREAKS' })}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    title="Dividir todas las preguntas en secciones individuales"
                  >
                    <Scissors className="h-4 w-4" />
                    Dividir todas
                  </button>
                ) : (
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_ALL_SECTION_BREAKS' })}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:opacity-80 transition-colors"
                    title="Quitar todas las divisiones de sección"
                  >
                    <X className="h-4 w-4" />
                    Quitar divisiones ({instrument.sectionBreaks.length})
                  </button>
                )}
              </>
            )}
          </div>
          <span className="text-xs text-[var(--muted)]">
            {instrument.questions.length} pregunta{instrument.questions.length !== 1 ? 's' : ''}
            {hasSections && ` · ${instrument.sectionBreaks.length + 1} secciones`}
          </span>
        </div>
      )}

      {/* Divider */}
      <hr className="border-[var(--border)]" />

      {/* Questions with section dividers */}
      <div className="space-y-1">
        {instrument.questions.map((q, index) => (
          <div key={q.id}>
            <QuestionCard question={q} showScoring={showScoring} />
            {/* Section divider between questions (not after the last one) */}
            {index < instrument.questions.length - 1 && (
              <SectionDivider
                afterIndex={index}
                isActive={instrument.sectionBreaks.includes(index)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add question */}
      <AddQuestionCard />
    </div>
  );
}
