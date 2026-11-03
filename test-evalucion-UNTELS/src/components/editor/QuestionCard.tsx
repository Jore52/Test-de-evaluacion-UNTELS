'use client';

import { Copy, Trash2, GripVertical, Hash } from 'lucide-react';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import { useInstrument } from '@/context/InstrumentContext';
import { Question, QuestionType, Option, ScaleConfig } from '@/lib/types';
import { QUESTION_TYPE_LABELS } from '@/lib/utils';
import { ShortText, LongText, SingleChoice, MultipleChoice, Scale, PointScale } from './question-types';

const questionTypeOptions = Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface QuestionCardProps {
  question: Question;
  showScoring: boolean;
}

function getMaxScore(question: Question): number | null {
  switch (question.type) {
    case 'single-choice':
      return question.options.length > 0 ? Math.max(...question.options.map((o) => o.points)) : null;
    case 'multi-choice':
      return question.options.reduce((sum, o) => sum + o.points, 0) || null;
    case 'scale':
    case 'point-scale':
      return question.scaleConfig.max;
    default:
      return null;
  }
}

export default function QuestionCard({ question, showScoring }: QuestionCardProps) {
  const { dispatch } = useInstrument();

  const updateQuestion = (updates: Partial<Question>) => {
    dispatch({ type: 'UPDATE_QUESTION', payload: { id: question.id, updates } });
  };

  const handleTypeChange = (newType: QuestionType) => {
    const updates: Partial<Question> = { type: newType };

    if ((newType === 'single-choice' || newType === 'multi-choice') && question.options.length === 0) {
      updates.options = [
        { id: crypto.randomUUID(), label: 'Opción 1', points: 0 },
        { id: crypto.randomUUID(), label: 'Opción 2', points: 1 },
      ];
    }

    if ((newType === 'scale' || newType === 'point-scale') && question.scaleConfig.min === 0 && question.scaleConfig.max === 5) {
      updates.scaleConfig = { min: 0, max: 5, startLabel: '', endLabel: '', pointLabels: {} };
    }

    updateQuestion(updates);
  };

  const handleOptionsChange = (options: Option[]) => updateQuestion({ options });
  const handleAllowOtherChange = (allowOther: boolean) => updateQuestion({ allowOther });
  const handleScaleChange = (scaleConfig: ScaleConfig) => updateQuestion({ scaleConfig });

  const maxScore = getMaxScore(question);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm hover:shadow-md transition-shadow">
      {/* Drag handle + Main content */}
      <div className="flex gap-0">
        <div className="flex items-start pt-5 pl-2 cursor-grab text-[var(--muted)] hover:text-[var(--text)]">
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 p-5 pl-2">
          {/* Question text + Type selector + Score badge */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--muted)] shrink-0">P{question.position + 1}</span>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateQuestion({ text: e.target.value })}
                placeholder="Escribe la pregunta aquí..."
                className="flex-1 bg-transparent text-[var(--text)] text-base outline-none border-b-2 border-[var(--border)] focus:border-[var(--primary)] transition-colors pb-1.5 placeholder:text-[var(--muted)]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {showScoring && maxScore !== null && (
                <div className="flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2.5 py-1" title="Puntaje máximo">
                  <Hash className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span className="text-xs font-semibold text-[var(--primary)]">{maxScore}</span>
                </div>
              )}
              <div className="w-full sm:w-48">
                <Select
                  options={questionTypeOptions}
                  value={question.type}
                  onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                />
              </div>
            </div>
          </div>

          {/* Type-specific content */}
          <div className="mt-4">
            <QuestionTypeRenderer
              question={question}
              showScoring={showScoring}
              onOptionsChange={handleOptionsChange}
              onAllowOtherChange={handleAllowOtherChange}
              onScaleChange={handleScaleChange}
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)]/50 rounded-b-xl">
        <Switch
          checked={question.required}
          onChange={(checked) => updateQuestion({ required: checked })}
          label="Obligatorio"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'DUPLICATE_QUESTION', payload: question.id })}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
            title="Duplicar pregunta"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => dispatch({ type: 'DELETE_QUESTION', payload: question.id })}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Eliminar pregunta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Type Renderer ───
interface QuestionTypeRendererProps {
  question: Question;
  showScoring: boolean;
  onOptionsChange: (options: Option[]) => void;
  onAllowOtherChange: (allowOther: boolean) => void;
  onScaleChange: (config: ScaleConfig) => void;
}

function QuestionTypeRenderer({
  question,
  showScoring,
  onOptionsChange,
  onAllowOtherChange,
  onScaleChange,
}: QuestionTypeRendererProps) {
  switch (question.type) {
    case 'short-text':
      return <ShortText />;
    case 'long-text':
      return <LongText />;
    case 'single-choice':
      return (
        <SingleChoice
          options={question.options}
          allowOther={question.allowOther}
          showScoring={showScoring}
          onOptionsChange={onOptionsChange}
          onAllowOtherChange={onAllowOtherChange}
        />
      );
    case 'multi-choice':
      return (
        <MultipleChoice
          options={question.options}
          allowOther={question.allowOther}
          showScoring={showScoring}
          onOptionsChange={onOptionsChange}
          onAllowOtherChange={onAllowOtherChange}
        />
      );
    case 'scale':
      return <Scale config={question.scaleConfig} onChange={onScaleChange} />;
    case 'point-scale':
      return <PointScale config={question.scaleConfig} onChange={onScaleChange} />;
    default:
      return null;
  }
}
