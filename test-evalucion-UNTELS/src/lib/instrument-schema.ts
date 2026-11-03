import { z } from 'zod';
import type { Instrument } from './types';

const str = z.string().max(5000);
const id = z.string().min(1).max(100);
const num = z.number().finite();
const range = z.tuple([num, num]);
const level = z.enum(['low', 'mid', 'high']);

// Valida la forma del Instrument que guarda el editor (frontera de confianza del PUT).
export const instrumentSchema = z.object({
  id,
  title: z.string().max(300),
  description: str,
  status: z.enum(['draft', 'published']),
  questions: z.array(z.object({
    id, text: str,
    type: z.enum(['short-text', 'long-text', 'single-choice', 'multi-choice', 'scale', 'point-scale']),
    required: z.boolean(),
    options: z.array(z.object({ id, label: str, points: num })).max(100),
    allowOther: z.boolean(),
    scaleConfig: z.object({
      min: z.number().int().min(-100).max(100), max: z.number().int().min(-100).max(100),
      startLabel: str, endLabel: str, pointLabels: z.record(z.string(), str),
    }),
    areaId: id.nullable(),
    position: num,
  })).max(500),
  areas: z.array(z.object({ id, name: str, color: z.string().max(50), questionIds: z.array(id) })).max(50),
  percentiles: z.array(z.object({ id, label: str, number: num, values: z.record(z.string(), num) })).max(100),
  levels: z.array(z.object({ areaId: id, low: range, mid: range, high: range })),
  careers: z.array(z.object({ id, name: str, requirements: z.record(z.string(), level) })).max(200),
  generalConfig: z.object({ singleResponse: z.boolean(), finalTitle: str.default(''), scoringMode: z.boolean().default(false), finalMessage: str }),
  sectionBreaks: z.array(z.number().int()),
  sectionMessages: z.array(z.object({ afterIndex: z.number().int(), text: str })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export function parseInstrument(v: unknown): Instrument | null {
  const r = instrumentSchema.safeParse(v);
  return r.success ? (r.data as Instrument) : null;
}
