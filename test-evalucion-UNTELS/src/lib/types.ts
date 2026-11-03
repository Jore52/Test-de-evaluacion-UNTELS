export type QuestionType = 'short-text' | 'long-text' | 'single-choice' | 'multi-choice' | 'scale' | 'point-scale';

export interface Option {
  id: string;
  label: string;
  points: number;
}

export interface ScaleConfig {
  min: number;
  max: number;
  startLabel: string;
  endLabel: string;
  pointLabels: Record<number, string>;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options: Option[];
  allowOther: boolean;
  scaleConfig: ScaleConfig;
  areaId: string | null;
  position: number;
}

export interface Area {
  id: string;
  name: string;
  color: string;
  questionIds: string[];
}

export interface PercentileColumn {
  id: string;
  label: string;
  number: number; // número editable que define el percentil (ej: 25, 50, 75)
  values: Record<string, number>;
}

export interface LevelRange {
  areaId: string;
  low: [number, number];
  mid: [number, number];
  high: [number, number];
}

export interface CareerRecommendation {
  id: string;
  name: string;
  requirements: Record<string, 'low' | 'mid' | 'high'>;
}

export interface SectionMessage {
  afterIndex: number; // índice de pregunta después de la cual aparece el mensaje
  text: string;       // contenido del mensaje intermedio
}

export interface GeneralConfig {
  singleResponse: boolean;
  finalTitle: string; // vacío = título por defecto
  scoringMode: boolean; // el editor muestra los puntajes
  finalMessage: string;
}

export interface Instrument {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  questions: Question[];
  areas: Area[];
  percentiles: PercentileColumn[];
  levels: LevelRange[];
  careers: CareerRecommendation[];
  generalConfig: GeneralConfig;
  sectionBreaks: number[]; // posiciones (índices de pregunta) donde hay corte de sección
  sectionMessages: SectionMessage[]; // mensajes intermedios en cada sección
  createdAt: string;
  updatedAt: string;
}

// ─── Response types ───

export type AnswerValue = string | string[] | number | null;

export interface SurveyResponse {
  id: string;
  instrumentId: string;
  respondentName: string;
  answers: Record<string, AnswerValue>; // questionId → answer
  totalScore: number | null;
  submittedAt: string;
  result?: import('./scoring').SurveyResult;
}

export function createDefaultQuestion(position: number): Question {
  return {
    id: crypto.randomUUID(),
    text: '',
    type: 'short-text',
    required: true,
    options: [],
    allowOther: false,
    scaleConfig: { min: 0, max: 5, startLabel: '', endLabel: '', pointLabels: {} },
    areaId: null,
    position,
  };
}

export function createDefaultInstrument(): Instrument {
  return {
    id: crypto.randomUUID(),
    title: 'Nuevo Instrumento',
    description: '',
    status: 'draft',
    questions: [],
    areas: [],
    percentiles: [],
    levels: [],
    careers: [],
    generalConfig: {
      singleResponse: true,
      finalTitle: '',
      scoringMode: false,
      finalMessage: '¡Gracias por completar el instrumento!',
    },
    sectionBreaks: [],
    sectionMessages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
