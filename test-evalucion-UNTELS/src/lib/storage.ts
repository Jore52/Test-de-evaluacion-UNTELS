import type { Instrument } from './types';

export type InstrumentSummary = Instrument & { responseCount: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesión expirada.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Error de red.');
  return body as T;
}

export const loadInstruments = () => api<InstrumentSummary[]>('/api/instruments');
export const loadInstrument = (id: string) => api<Instrument>(`/api/instruments/${encodeURIComponent(id)}`);
export const createInstrument = () => api<Instrument>('/api/instruments', { method: 'POST', body: '{}' });
export const saveInstrument = (inst: Instrument) =>
  api<Instrument>(`/api/instruments/${encodeURIComponent(inst.id)}`, { method: 'PUT', body: JSON.stringify(inst) });
export const deleteInstrument = (id: string) => api<{ ok: true }>(`/api/instruments/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const duplicateInstrument = (id: string) =>
  api<Instrument>(`/api/instruments/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body: '{}' });
export const publishInstrument = (id: string, publish: boolean) =>
  api<Instrument>(`/api/instruments/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({ publish }) });
export { api };
