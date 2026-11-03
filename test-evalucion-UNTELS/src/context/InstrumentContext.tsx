'use client';

import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import {
  Instrument,
  Question,
  Area,
  PercentileColumn,
  LevelRange,
  CareerRecommendation,
  GeneralConfig,
  SectionMessage,
  createDefaultInstrument,
  createDefaultQuestion,
} from '@/lib/types';

// ─── Actions ───
export type InstrumentAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'ADD_QUESTION' }
  | { type: 'ADD_QUESTIONS'; payload: string[] }
  | { type: 'SET_PERCENTILES'; payload: PercentileColumn[] }
  | { type: 'SET_LEVELS'; payload: LevelRange[] }
  | { type: 'UPDATE_QUESTION'; payload: { id: string; updates: Partial<Question> } }
  | { type: 'DELETE_QUESTION'; payload: string }
  | { type: 'DUPLICATE_QUESTION'; payload: string }
  | { type: 'REORDER_QUESTIONS'; payload: Question[] }
  // Areas
  | { type: 'ADD_AREA'; payload: { name: string; color: string } }
  | { type: 'UPDATE_AREA'; payload: { id: string; updates: Partial<Area> } }
  | { type: 'DELETE_AREA'; payload: string }
  | { type: 'TOGGLE_QUESTION_AREA'; payload: { areaId: string; questionId: string } }
  // Percentiles
  | { type: 'ADD_PERCENTILE_COLUMN'; payload: { label: string } }
  | { type: 'DELETE_PERCENTILE_COLUMN'; payload: string }
  | { type: 'UPDATE_PERCENTILE_LABEL'; payload: { columnId: string; label: string } }
  | { type: 'UPDATE_PERCENTILE_NUMBER'; payload: { columnId: string; number: number } }
  | { type: 'UPDATE_PERCENTILE_VALUE'; payload: { columnId: string; areaId: string; value: number } }
  // Levels
  | { type: 'UPDATE_LEVEL'; payload: LevelRange }
  | { type: 'INIT_LEVELS' }
  // Careers
  | { type: 'ADD_CAREER'; payload: { name: string } }
  | { type: 'DELETE_CAREER'; payload: string }
  | { type: 'UPDATE_CAREER_REQUIREMENT'; payload: { careerId: string; areaId: string; level: 'low' | 'mid' | 'high' | '' } }
  // General Config
  | { type: 'UPDATE_GENERAL_CONFIG'; payload: Partial<GeneralConfig> }
  // Sections
  | { type: 'ADD_SECTION_BREAK'; payload: number }
  | { type: 'REMOVE_SECTION_BREAK'; payload: number }
  | { type: 'SET_ALL_SECTION_BREAKS' }
  | { type: 'CLEAR_ALL_SECTION_BREAKS' }
  // Section Messages
  | { type: 'UPDATE_SECTION_MESSAGE'; payload: { afterIndex: number; text: string } }
  | { type: 'REMOVE_SECTION_MESSAGE'; payload: number }
  // General
  | { type: 'LOAD_INSTRUMENT'; payload: Instrument }
  | { type: 'SET_STATUS'; payload: Instrument['status'] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ─── State with history ───
interface InstrumentState {
  current: Instrument;
  past: Instrument[];
  future: Instrument[];
}

function pushHistory(state: InstrumentState): InstrumentState {
  return {
    ...state,
    past: [...state.past.slice(-30), state.current],
    future: [],
  };
}

const AREA_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

function instrumentReducer(state: InstrumentState, action: InstrumentAction): InstrumentState {
  switch (action.type) {
    case 'SET_TITLE': {
      const prev = pushHistory(state);
      return { ...prev, current: { ...prev.current, title: action.payload, updatedAt: new Date().toISOString() } };
    }
    case 'SET_DESCRIPTION': {
      const prev = pushHistory(state);
      return { ...prev, current: { ...prev.current, description: action.payload, updatedAt: new Date().toISOString() } };
    }
    case 'ADD_QUESTION': {
      const prev = pushHistory(state);
      const newQ = createDefaultQuestion(prev.current.questions.length);
      return {
        ...prev,
        current: {
          ...prev.current,
          questions: [...prev.current.questions, newQ],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'ADD_QUESTIONS': {
      const prev = pushHistory(state);
      const qs = prev.current.questions;
      const last = qs[qs.length - 1];
      // Copia la configuración de la última pregunta (sin área, como Duplicar)
      const added = action.payload.map((text, i): Question => {
        const base = last
          ? { ...last, options: last.options.map((o) => ({ ...o, id: crypto.randomUUID() })) }
          : createDefaultQuestion(0);
        return { ...base, id: crypto.randomUUID(), text, areaId: null, position: qs.length + i };
      });
      return { ...prev, current: { ...prev.current, questions: [...qs, ...added], updatedAt: new Date().toISOString() } };
    }
    case 'SET_PERCENTILES': {
      const prev = pushHistory(state);
      return { ...prev, current: { ...prev.current, percentiles: action.payload, updatedAt: new Date().toISOString() } };
    }
    case 'SET_LEVELS': {
      const prev = pushHistory(state);
      return { ...prev, current: { ...prev.current, levels: action.payload, updatedAt: new Date().toISOString() } };
    }
    case 'UPDATE_QUESTION': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          questions: prev.current.questions.map((q) =>
            q.id === action.payload.id ? { ...q, ...action.payload.updates } : q
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'DELETE_QUESTION': {
      const prev = pushHistory(state);
      const deletedId = action.payload;
      return {
        ...prev,
        current: {
          ...prev.current,
          questions: prev.current.questions
            .filter((q) => q.id !== deletedId)
            .map((q, i) => ({ ...q, position: i })),
          areas: prev.current.areas.map((a) => ({
            ...a,
            questionIds: a.questionIds.filter((qid) => qid !== deletedId),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'DUPLICATE_QUESTION': {
      const prev = pushHistory(state);
      const original = prev.current.questions.find((q) => q.id === action.payload);
      if (!original) return state;
      const idx = prev.current.questions.findIndex((q) => q.id === action.payload);
      const duplicate: Question = { ...original, id: crypto.randomUUID(), position: idx + 1 };
      const questions = [...prev.current.questions];
      questions.splice(idx + 1, 0, duplicate);
      return {
        ...prev,
        current: {
          ...prev.current,
          questions: questions.map((q, i) => ({ ...q, position: i })),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'REORDER_QUESTIONS': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          questions: action.payload.map((q, i) => ({ ...q, position: i })),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Areas ───
    case 'ADD_AREA': {
      const prev = pushHistory(state);
      const newArea: Area = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        color: action.payload.color || AREA_COLORS[prev.current.areas.length % AREA_COLORS.length],
        questionIds: [],
      };
      return {
        ...prev,
        current: {
          ...prev.current,
          areas: [...prev.current.areas, newArea],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_AREA': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          areas: prev.current.areas.map((a) =>
            a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'DELETE_AREA': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          areas: prev.current.areas.filter((a) => a.id !== action.payload),
          percentiles: prev.current.percentiles.map((col) => {
            const { [action.payload]: _, ...rest } = col.values;
            return { ...col, values: rest };
          }),
          levels: prev.current.levels.filter((l) => l.areaId !== action.payload),
          careers: prev.current.careers.map((c) => {
            const { [action.payload]: _, ...rest } = c.requirements;
            return { ...c, requirements: rest };
          }),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'TOGGLE_QUESTION_AREA': {
      const prev = pushHistory(state);
      const { areaId, questionId } = action.payload;
      return {
        ...prev,
        current: {
          ...prev.current,
          areas: prev.current.areas.map((a) => {
            if (a.id !== areaId) {
              // Remove from other areas
              return { ...a, questionIds: a.questionIds.filter((qid) => qid !== questionId) };
            }
            // Toggle in target area
            const has = a.questionIds.includes(questionId);
            return {
              ...a,
              questionIds: has
                ? a.questionIds.filter((qid) => qid !== questionId)
                : [...a.questionIds, questionId],
            };
          }),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Percentiles ───
    case 'ADD_PERCENTILE_COLUMN': {
      const prev = pushHistory(state);
      const colIndex = prev.current.percentiles.length + 1;
      const newCol: PercentileColumn = {
        id: crypto.randomUUID(),
        label: `PC ${colIndex}`,
        number: 0,
        values: Object.fromEntries(prev.current.areas.map((a) => [a.id, 0])),
      };
      return {
        ...prev,
        current: {
          ...prev.current,
          percentiles: [...prev.current.percentiles, newCol],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'DELETE_PERCENTILE_COLUMN': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          percentiles: prev.current.percentiles.filter((c) => c.id !== action.payload),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_PERCENTILE_LABEL': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          percentiles: prev.current.percentiles.map((c) =>
            c.id === action.payload.columnId ? { ...c, label: action.payload.label } : c
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_PERCENTILE_NUMBER': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          percentiles: prev.current.percentiles.map((c) =>
            c.id === action.payload.columnId ? { ...c, number: action.payload.number } : c
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_PERCENTILE_VALUE': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          percentiles: prev.current.percentiles.map((c) =>
            c.id === action.payload.columnId
              ? { ...c, values: { ...c.values, [action.payload.areaId]: action.payload.value } }
              : c
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Levels ───
    case 'INIT_LEVELS': {
      const prev = pushHistory(state);
      const existingIds = new Set(prev.current.levels.map((l) => l.areaId));
      const newLevels = prev.current.areas
        .filter((a) => !existingIds.has(a.id))
        .map((a) => ({ areaId: a.id, low: [0, 0] as [number, number], mid: [0, 0] as [number, number], high: [0, 0] as [number, number] }));
      return {
        ...prev,
        current: {
          ...prev.current,
          levels: [...prev.current.levels, ...newLevels],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_LEVEL': {
      const prev = pushHistory(state);
      const exists = prev.current.levels.some((l) => l.areaId === action.payload.areaId);
      return {
        ...prev,
        current: {
          ...prev.current,
          levels: exists
            ? prev.current.levels.map((l) => (l.areaId === action.payload.areaId ? action.payload : l))
            : [...prev.current.levels, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Careers ───
    case 'ADD_CAREER': {
      const prev = pushHistory(state);
      const newCareer: CareerRecommendation = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        requirements: {},
      };
      return {
        ...prev,
        current: {
          ...prev.current,
          careers: [...prev.current.careers, newCareer],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'DELETE_CAREER': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          careers: prev.current.careers.filter((c) => c.id !== action.payload),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_CAREER_REQUIREMENT': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          careers: prev.current.careers.map((c) => {
            if (c.id !== action.payload.careerId) return c;
            const reqs = { ...c.requirements };
            if (action.payload.level === '') {
              delete reqs[action.payload.areaId];
            } else {
              reqs[action.payload.areaId] = action.payload.level;
            }
            return { ...c, requirements: reqs };
          }),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── General Config ───
    case 'UPDATE_GENERAL_CONFIG': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          generalConfig: { ...prev.current.generalConfig, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Section Breaks ───
    case 'ADD_SECTION_BREAK': {
      const prev = pushHistory(state);
      const pos = action.payload;
      if (prev.current.sectionBreaks.includes(pos)) return state;
      // Also add an empty section message for this break
      const newMessage: SectionMessage = { afterIndex: pos, text: '' };
      const existingMessages = prev.current.sectionMessages.filter((m) => m.afterIndex !== pos);
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionBreaks: [...prev.current.sectionBreaks, pos].sort((a, b) => a - b),
          sectionMessages: [...existingMessages, newMessage].sort((a, b) => a.afterIndex - b.afterIndex),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'REMOVE_SECTION_BREAK': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionBreaks: prev.current.sectionBreaks.filter((p) => p !== action.payload),
          sectionMessages: prev.current.sectionMessages.filter((m) => m.afterIndex !== action.payload),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'SET_ALL_SECTION_BREAKS': {
      const prev = pushHistory(state);
      // Add break after every question except the last
      const allBreaks = prev.current.questions.slice(0, -1).map((_, i) => i);
      // Create empty messages for new breaks only
      const existingMsgMap = new Map(prev.current.sectionMessages.map((m) => [m.afterIndex, m]));
      const allMessages = allBreaks.map((idx) => existingMsgMap.get(idx) ?? { afterIndex: idx, text: '' });
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionBreaks: allBreaks,
          sectionMessages: allMessages,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'CLEAR_ALL_SECTION_BREAKS': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionBreaks: [],
          sectionMessages: [],
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── Section Messages ───
    case 'UPDATE_SECTION_MESSAGE': {
      const prev = pushHistory(state);
      const { afterIndex, text } = action.payload;
      const exists = prev.current.sectionMessages.some((m) => m.afterIndex === afterIndex);
      const updatedMessages = exists
        ? prev.current.sectionMessages.map((m) =>
            m.afterIndex === afterIndex ? { ...m, text } : m
          )
        : [...prev.current.sectionMessages, { afterIndex, text }].sort((a, b) => a.afterIndex - b.afterIndex);
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionMessages: updatedMessages,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    case 'REMOVE_SECTION_MESSAGE': {
      const prev = pushHistory(state);
      return {
        ...prev,
        current: {
          ...prev.current,
          sectionMessages: prev.current.sectionMessages.map((m) =>
            m.afterIndex === action.payload ? { ...m, text: '' } : m
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // ─── General ───
    case 'LOAD_INSTRUMENT': {
      return { current: action.payload, past: [], future: [] };
    }
    case 'SET_STATUS': {
      const set = (i: Instrument) => ({ ...i, status: action.payload });
      return { current: set(state.current), past: state.past.map(set), future: state.future.map(set) };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { current: previous, past: state.past.slice(0, -1), future: [state.current, ...state.future] };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return { current: next, past: [...state.past, state.current], future: state.future.slice(1) };
    }
    default:
      return state;
  }
}

// ─── Context ───
interface InstrumentContextValue {
  instrument: Instrument;
  dispatch: Dispatch<InstrumentAction>;
  canUndo: boolean;
  canRedo: boolean;
}

const InstrumentContext = createContext<InstrumentContextValue | null>(null);

export function InstrumentProvider({ children, initial }: { children: ReactNode; initial?: Instrument }) {
  const [state, dispatch] = useReducer(instrumentReducer, {
    current: initial ?? createDefaultInstrument(),
    past: [],
    future: [],
  });

  return (
    <InstrumentContext.Provider
      value={{
        instrument: state.current,
        dispatch,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
      }}
    >
      {children}
    </InstrumentContext.Provider>
  );
}

export function useInstrument() {
  const ctx = useContext(InstrumentContext);
  if (!ctx) throw new Error('useInstrument must be used within InstrumentProvider');
  return ctx;
}
