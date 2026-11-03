import { getAccessToken, GoogleError, reasonOf, type TokenSource } from './token';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const e = encodeURIComponent;

export interface SheetsApi {
  create(title: string): Promise<{ spreadsheetId: string; url: string }>;
  meta(id: string): Promise<{ title: string; sheets: { sheetId: number; title: string; columnCount: number }[] }>;
  addSheet(id: string, title: string): Promise<number>;
  readColumn(id: string, range: string): Promise<string[]>;
  writeRanges(id: string, data: { range: string; values: (string | number)[][] }[]): Promise<void>;
  /** USER_ENTERED: solo para fórmulas del sistema (Dashboard), nunca datos del participante. */
  writeFormulas(id: string, data: { range: string; values: (string | number)[][] }[]): Promise<void>;
  append(id: string, range: string, values: (string | number)[][]): Promise<void>;
  batchUpdate(id: string, requests: unknown[]): Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Init = { method?: string; json?: unknown; body?: Buffer; type?: string };

async function call(src: TokenSource, scope: string, fetchFn: typeof fetch, url: string, init: Init = {}): Promise<Json> {
  const token = await getAccessToken(src, [scope], fetchFn);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  if (init.type) headers['Content-Type'] = init.type;
  const res = await fetchFn(url, {
    method: init.method ?? 'GET',
    headers,
    body: (init.body as BodyInit | undefined) ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body?.error?.message === 'string' ? body.error.message.slice(0, 200) : '';
    throw new GoogleError(`Google respondió ${res.status}${msg ? `: ${msg}` : ''}`, res.status, reasonOf(res.status));
  }
  return body;
}

export function sheetsApi(src: TokenSource, fetchFn: typeof fetch = fetch): SheetsApi {
  const c = (url: string, init?: Init) => call(src, SHEETS_SCOPE, fetchFn, url, init);
  return {
    async create(title) {
      const r = await c(SHEETS, { method: 'POST', json: { properties: { title }, sheets: [{ properties: { title: 'Respuestas' } }] } });
      return { spreadsheetId: r.spreadsheetId, url: r.spreadsheetUrl };
    },
    async meta(id) {
      const r = await c(`${SHEETS}/${e(id)}?fields=${e('properties.title,sheets.properties(sheetId,title,gridProperties.columnCount)')}`);
      return {
        title: r.properties?.title ?? '',
        sheets: (r.sheets ?? []).map((s: Json) => ({
          sheetId: s.properties.sheetId, title: s.properties.title, columnCount: s.properties.gridProperties?.columnCount ?? 26,
        })),
      };
    },
    async addSheet(id, title) {
      const r = await c(`${SHEETS}/${e(id)}:batchUpdate`, { method: 'POST', json: { requests: [{ addSheet: { properties: { title } } }] } });
      return r.replies[0].addSheet.properties.sheetId;
    },
    async readColumn(id, range) {
      const r = await c(`${SHEETS}/${e(id)}/values/${e(range)}`);
      return (r.values ?? []).map((row: unknown[]) => String(row[0] ?? ''));
    },
    async writeRanges(id, data) {
      await c(`${SHEETS}/${e(id)}/values:batchUpdate`, { method: 'POST', json: { valueInputOption: 'RAW', data } });
    },
    async writeFormulas(id, data) {
      await c(`${SHEETS}/${e(id)}/values:batchUpdate`, { method: 'POST', json: { valueInputOption: 'USER_ENTERED', data } });
    },
    async append(id, range, values) {
      await c(`${SHEETS}/${e(id)}/values/${e(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', json: { values } });
    },
    batchUpdate: (id, requests) => c(`${SHEETS}/${e(id)}:batchUpdate`, { method: 'POST', json: { requests } }),
  };
}

export function spreadsheetIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com') return null;
    return /^\/spreadsheets\/d\/([\w-]+)/.exec(u.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}
