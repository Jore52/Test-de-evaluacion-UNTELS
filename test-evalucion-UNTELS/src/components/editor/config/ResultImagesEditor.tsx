'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useInstrument } from '@/context/InstrumentContext';
import ImageCropper from '@/components/ui/ImageCropper';
import { uploadDataUrl } from '@/lib/image';

export const MAX_RESULT_IMAGES = 6;

/** Imágenes de publicidad de admisión que se muestran al final del resultado. */
export default function ResultImagesEditor() {
  const { instrument, dispatch } = useInstrument();
  const list = instrument.generalConfig.resultImages ?? [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const set = (resultImages: string[]) => dispatch({ type: 'UPDATE_GENERAL_CONFIG', payload: { resultImages } });
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set(next);
  };

  const add = async (dataUrl: string) => {
    setFile(null);
    setBusy(true);
    setError(null);
    try {
      set([...list, await uploadDataUrl(dataUrl)]);
    } catch (e) {
      setError((e as Error).message || 'No se pudo subir la imagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)]">
        Se muestran en una ventana al final del resultado. Formato cuadrado 1:1 (1080×1080): al subirla puedes arrastrarla y hacer zoom para encuadrarla. Máximo {MAX_RESULT_IMAGES}.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((src, i) => (
          <div key={src} className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen propia de /api/images */}
            <img src={src} alt={`Publicidad ${i + 1}`} className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/55 p-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir imagen ${i + 1}`} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Bajar imagen ${i + 1}`} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => set(list.filter((_, j) => j !== i))} aria-label={`Quitar imagen ${i + 1}`} className="rounded p-1 text-white hover:bg-red-500/70">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {list.length < MAX_RESULT_IMAGES && (
          <label className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] ${busy ? 'opacity-60' : 'cursor-pointer hover:text-[var(--text)] hover:border-[var(--primary)]'}`}>
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs">{busy ? 'Subiendo…' : 'Agregar'}</span>
            <input type="file" accept="image/*" className="sr-only" aria-label="Agregar imagen de publicidad" disabled={busy}
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <ImageCropper file={file} aspect={1} out={[1080, 1080]} onCancel={() => setFile(null)} onDone={add} />
    </div>
  );
}
