'use client';

import { useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';
import Switch from '@/components/ui/Switch';
import ImageCropper from '@/components/ui/ImageCropper';
import { uploadDataUrl } from '@/lib/image';
import type { Cover } from '@/lib/types';

const EMPTY: Cover = { desktop: '', mobile: '', showText: true, overlayColor: '#000000', overlayOpacity: 0.5 };

const SLOTS = [
  { key: 'desktop', label: 'Escritorio', hint: 'Horizontal 3:1 (1600×533)', aspect: 'aspect-[3/1]', ratio: 3, out: [1600, 533] },
  { key: 'mobile', label: 'Móvil (opcional)', hint: 'Vertical 4:5 (900×1125). Si falta, se usa la de escritorio', aspect: 'aspect-[4/5] max-w-[160px]', ratio: 4 / 5, out: [900, 1125] },
] as const;

/** Imagen de portada de la pantalla de inicio: una para escritorio y otra para móvil, así ninguna se deforma. */
export default function CoverEditor() {
  const { instrument, dispatch } = useInstrument();
  const cover = instrument.generalConfig.cover ?? EMPTY;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'desktop' | 'mobile' | null>(null);
  const [crop, setCrop] = useState<{ slot: (typeof SLOTS)[number]; file: File } | null>(null);

  const update = (c: Partial<Cover>) => dispatch({ type: 'UPDATE_GENERAL_CONFIG', payload: { cover: { ...cover, ...c } } });

  const upload = async (key: 'desktop' | 'mobile', dataUrl: string) => {
    setCrop(null);
    setError(null);
    setBusy(key);
    try {
      update({ [key]: await uploadDataUrl(dataUrl) });
    } catch (e) {
      setError((e as Error).message || 'No se pudo subir la imagen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--muted)]">Cubre el área del título y la descripción. Al subirla puedes arrastrarla y hacer zoom para elegir qué parte se ve; la miniatura muestra el recorte.</p>
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        {SLOTS.map((slot) => { const { key, label, hint, aspect } = slot; return (
          <div key={key} className={`space-y-1.5 ${key === 'desktop' ? 'flex-1 min-w-[220px]' : ''}`}>
            <p className="text-xs font-medium text-[var(--text)]">{label}</p>
            <div className={`relative w-full ${aspect} overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]`}>
              {cover[key] ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen propia de /api/images */}
                  <img src={cover[key]} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => update({ [key]: '' })} title="Quitar imagen" aria-label={`Quitar imagen ${label}`}
                    className="absolute top-1.5 right-1.5 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer text-[var(--muted)] hover:text-[var(--text)]">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">{busy === key ? 'Subiendo…' : 'Subir'}</span>
                  <input type="file" accept="image/*" className="sr-only" aria-label={`Subir imagen ${label}`} disabled={busy !== null}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) setCrop({ slot, file }); e.target.value = ''; }} />
                </label>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted)]">{hint}</p>
          </div>
        ); })}
      </div>

      <ImageCropper file={crop?.file ?? null} aspect={crop?.slot.ratio ?? 1} out={crop?.slot.out ?? [1, 1]}
        onCancel={() => setCrop(null)} onDone={(dataUrl) => upload(crop!.slot.key, dataUrl)} />

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      {cover.desktop && (
        <div className="space-y-3 border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--text)]">Mostrar título y descripción sobre la imagen</p>
            <Switch checked={cover.showText} onChange={(showText) => update({ showText })} />
          </div>
          {cover.showText && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                Color de fondo del texto
                <input type="color" value={cover.overlayColor} onChange={(e) => update({ overlayColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent" />
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                Opacidad
                <input type="range" min={0} max={1} step={0.05} value={cover.overlayOpacity}
                  onChange={(e) => update({ overlayOpacity: Number(e.target.value) })} className="w-28 accent-[var(--primary)]" />
                <span className="w-8 tabular-nums">{Math.round(cover.overlayOpacity * 100)}%</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
