'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, FileSpreadsheet, Link2Off, RefreshCw } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';
import { useCanManage } from '@/context/UserContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { api } from '@/lib/storage';

type Status =
  | { linked: false; available: boolean }
  | { linked: true; available: boolean; url: string; connectedEmail: string | null; dashboard: boolean; pending: number; lastError: string | null };

// Debe coincidir con SHEETS_MSG del servidor (la URL de vuelta solo trae el código).
const MSG: Record<string, string> = {
  ok: 'Hoja vinculada. Las respuestas se están enviando.',
  cancelado: 'Se canceló la conexión con Google.',
  sin_refresh: 'Google no entregó permiso permanente; vuelve a intentarlo.',
  sin_config: 'Falta configurar Google (ver README).',
  enlace: 'El enlace no es de una hoja de Google Sheets.',
  permiso: 'Tu cuenta no tiene permiso de Editor en esa hoja.',
  no_encontrada: 'No se encontró la hoja; revisa el enlace.',
  google: 'Google no respondió o limitó los envíos; vuelve a intentarlo.',
  error: 'No se pudo conectar con Google; vuelve a intentarlo.',
};

export default function SheetsConfig() {
  const { instrument } = useInstrument();
  const canManage = useCanManage();
  const code = useSearchParams().get('sheets');
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<'nueva' | 'existente'>('nueva');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relinking, setRelinking] = useState(false);
  const base = `/api/instruments/${encodeURIComponent(instrument.id)}/sheets`;

  useEffect(() => {
    if (canManage) api<Status>(base).then(setStatus).catch((e: Error) => setError(e.message));
  }, [base, canManage]);

  if (!canManage) return null;

  const act = async (body: object) => {
    setBusy(true);
    setError(null);
    try { setStatus(await api<Status>(base, { method: 'POST', body: JSON.stringify(body) })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const showForm = status && (!status.linked || relinking);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Google Sheets</h4>
      <p className="text-xs text-[var(--muted)]">
        Cada respuesta se guarda en la base de datos del sistema y, además, en la hoja vinculada. Desvincular o cambiar de hoja no borra nada de la base.
      </p>
      {code && MSG[code] && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${code === 'ok' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10' : 'bg-red-50 text-red-600 dark:bg-red-900/10'}`}>{MSG[code]}</p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {!status ? (
          <p className="px-4 py-4 text-sm text-[var(--muted)]">Cargando…</p>
        ) : (
          <>
            {status.linked && (
              <>
                <div className="flex flex-wrap items-center gap-3 px-4 py-4">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={status.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                      Abrir hoja vinculada <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-xs text-[var(--muted)] break-all">
                      {status.connectedEmail ? `Cuenta: ${status.connectedEmail} · ` : ''}
                      {status.pending ? `${status.pending} respuesta(s) por enviar` : 'Todo enviado'}
                    </p>
                    {status.lastError && <p className="text-xs text-red-600 mt-1">Último error: {status.lastError}</p>}
                  </div>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: 'sync' })} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                    Sincronizar ahora
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-[var(--text)]">Agregar dashboard en otra hoja</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Crea la pestaña «Dashboard» con totales, niveles por área, carreras y respuestas por día. Se actualiza sola.
                    </p>
                  </div>
                  <Switch checked={status.dashboard} disabled={busy} onChange={(on) => act({ action: 'dashboard', on })} />
                </div>
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRelinking((v) => !v)}>
                    {relinking ? 'Cancelar' : 'Vincular a otra hoja'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    icon={<Link2Off className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (confirm('¿Desvincular la hoja? Las respuestas siguen guardadas en el sistema y en la hoja actual.')) act({ action: 'unlink' });
                    }}
                  >
                    Desvincular
                  </Button>
                </div>
              </>
            )}
            {showForm && (status.available ? (
              <form action="/api/sheets/connect" method="post" className="space-y-3 px-4 py-4">
                <input type="hidden" name="id" value={instrument.id} />
                <input type="hidden" name="modo" value={mode} />
                <div className="flex flex-col sm:flex-row gap-3 text-sm text-[var(--text)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={mode === 'nueva'} onChange={() => setMode('nueva')} className="accent-[var(--primary)]" />
                    Crear hoja nueva
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={mode === 'existente'} onChange={() => setMode('existente')} className="accent-[var(--primary)]" />
                    Usar una hoja existente
                  </label>
                </div>
                {mode === 'existente' && (
                  <Input name="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
                )}
                <p className="text-xs text-[var(--muted)]">Te pediremos autorizar tu cuenta de Google. Todas las respuestas ya recibidas se enviarán a la hoja.</p>
                <Button type="submit" size="sm" icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Vincular con Google Sheets</Button>
              </form>
            ) : (
              <p className="px-4 py-4 text-sm text-[var(--muted)]">Google no está configurado en el servidor (ver README).</p>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
