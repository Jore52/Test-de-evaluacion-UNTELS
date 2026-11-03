'use client';

import { useCallback, useEffect, useState } from 'react';
import SurveyRunner, { type Done } from '@/components/survey/SurveyRunner';
import type { AnswerValue, Instrument } from '@/lib/types';

const KEY = 'wf-device-token';
let memToken: string | null = null;

/** Token anónimo del dispositivo (identifica "ya respondí" sin pedir login). */
function deviceToken(): string {
  try {
    let t = localStorage.getItem(KEY);
    if (!t) { t = crypto.randomUUID(); localStorage.setItem(KEY, t); }
    return t;
  } catch {
    return (memToken ??= crypto.randomUUID()); // almacenamiento bloqueado: vale solo para esta visita
  }
}

async function post(url: string, body: unknown): Promise<Response> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error ?? 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  }
  return res;
}

export default function LiveSurvey({ instrument }: { instrument: Instrument }) {
  const base = `/api/responder/${encodeURIComponent(instrument.id)}`;
  const [previous, setPrevious] = useState<Done | null | undefined>(undefined);

  useEffect(() => {
    post(`${base}/status`, { deviceToken: deviceToken() })
      .then((r) => r.json())
      .then((b: { mine: Done | null }) => setPrevious(b.mine))
      .catch(() => setPrevious(null));
  }, [base]);

  const onSubmit = useCallback(async (answers: Record<string, AnswerValue>) =>
    (await post(`${base}/submit`, { deviceToken: deviceToken(), answers })).json() as Promise<Done>, [base]);
  const getImage = useCallback(async () => (await post(`${base}/image`, { deviceToken: deviceToken() })).blob(), [base]);

  if (previous === undefined) {
    return <div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /></div>;
  }
  return <SurveyRunner instrument={instrument} previous={previous} onSubmit={onSubmit} getImage={getImage} />;
}
