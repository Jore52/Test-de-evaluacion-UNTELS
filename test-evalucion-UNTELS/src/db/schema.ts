import { pgTable, uuid, text, jsonb, timestamp, boolean, integer, primaryKey, index, uniqueIndex, bigserial, doublePrecision } from 'drizzle-orm/pg-core';
import type { AnswerValue, Instrument } from '@/lib/types';
import type { SurveyResult } from '@/lib/scoring';
import type { Role } from '@/server/auth/types';

const ts = (name: string) => timestamp(name, { withTimezone: true });

// El Instrument del editor se guarda tal cual (jsonb): el editor no cambia de forma.
export const instruments = pgTable('instruments', {
  id: text('id').primaryKey(),
  doc: jsonb('doc').$type<Instrument>().notNull(),
  publishedDoc: jsonb('published_doc').$type<Instrument>(), // lo que ve el encuestado
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  instrumentId: text('instrument_id').notNull().references(() => instruments.id, { onDelete: 'cascade' }),
  respondentName: text('respondent_name').notNull(),
  answers: jsonb('answers').$type<Record<string, AnswerValue>>().notNull(),
  result: jsonb('result').$type<SurveyResult>().notNull(),
  totalScore: doublePrecision('total_score').notNull(),
  deviceTokenHash: text('device_token_hash').notNull(),
  completedAt: ts('completed_at').notNull().defaultNow(),
  modifiedAt: ts('modified_at').notNull().defaultNow(),
  sheetSyncedAt: ts('sheet_synced_at'),
}, (t) => [
  index('submissions_instrument_completed_idx').on(t.instrumentId, t.completedAt),
  // una respuesta por dispositivo: el upsert es atómico aunque lleguen dos envíos a la vez
  uniqueIndex('submissions_device_uq').on(t.instrumentId, t.deviceTokenHash),
]);

export const sheetLinks = pgTable('sheet_links', {
  instrumentId: text('instrument_id').primaryKey().references(() => instruments.id, { onDelete: 'cascade' }),
  spreadsheetId: text('spreadsheet_id').notNull(),
  spreadsheetUrl: text('spreadsheet_url').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  connectedEmail: text('connected_email'),
  columns: jsonb('columns').$type<{ key: string; header: string }[]>().notNull().default([]),
  dashboard: boolean('dashboard').notNull().default(false),
  lastError: text('last_error'),
  lastErrorAt: ts('last_error_at'),
  leaseUntil: ts('lease_until'),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text('key').notNull(),
  windowStart: ts('window_start').notNull(),
  count: integer('count').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.key, t.windowStart] })]);

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: ts('at').notNull().defaultNow(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull().default(''),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
});

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  picture: text('picture'),
  role: text('role', { enum: ['superadmin', 'admin', 'viewer'] }).$type<Role>().notNull(),
  active: boolean('active').notNull().default(true),
  passwordHash: text('password_hash'),
  totpSecretEnc: text('totp_secret_enc'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: ts('locked_until'),
  lastTotpStep: integer('last_totp_step'),
  lastLoginAt: ts('last_login_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  idHash: text('id_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});
