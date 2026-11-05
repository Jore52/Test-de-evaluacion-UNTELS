'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { canvasToDataUrl, cropLayout } from '@/lib/image';

const MAX_ZOOM = 4;

interface Props {
  file: File | null;
  /** ancho / alto del marco */
  aspect: number;
  /** tamaño en px de la imagen final */
  out: readonly [number, number];
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}

/** Recorta la imagen a una proporción fija: se arrastra para encuadrar y se hace zoom con el control o la rueda. */
export default function ImageCropper({ file, aspect, out, onDone, onCancel }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  // guardan el archivo al que pertenecen: así no hay que limpiarlos al cambiar de archivo
  const [loaded, setLoaded] = useState<{ file: File; url: string; bmp: ImageBitmap } | null>(null);
  const [failed, setFailed] = useState<File | null>(null);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    if (!file) return;
    let alive = true;
    const url = URL.createObjectURL(file);
    let bmp: ImageBitmap | undefined;
    createImageBitmap(file)
      .then((b) => {
        bmp = b;
        if (!alive) return b.close();
        setView({ zoom: 1, x: 0, y: 0 });
        setLoaded({ file, url, bmp: b });
      })
      .catch(() => alive && setFailed(file));
    return () => { alive = false; URL.revokeObjectURL(url); bmp?.close(); };
  }, [file]);

  const img = file && loaded?.file === file ? loaded : null;

  const layout = (zoom: number, x: number, y: number) => cropLayout(img!.bmp.width, img!.bmp.height, aspect, zoom, x, y);
  const setZoom = (next: (zoom: number) => number) => setView((v) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, next(v.zoom)));
    const k = zoom / v.zoom; // mantiene centrado el mismo punto
    const l = layout(zoom, v.x * k, v.y * k);
    return { zoom, x: l.x, y: l.y };
  });

  // la rueda necesita preventDefault, y React registra onWheel como pasivo
  useEffect(() => {
    const el = frame.current;
    if (!el || !img) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZoom((z) => z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setZoom solo depende de img y aspect
  }, [img, aspect]);

  const confirm = () => {
    const [sx, sy, sw, sh] = layout(view.zoom, view.x, view.y).rect;
    const canvas = Object.assign(document.createElement('canvas'), { width: out[0], height: out[1] });
    canvas.getContext('2d')!.drawImage(img!.bmp, sx, sy, sw, sh, 0, 0, out[0], out[1]);
    onDone(canvasToDataUrl(canvas));
  };

  const l = img && layout(view.zoom, view.x, view.y);

  return (
    <Modal open={!!file} onClose={onCancel} title="Ajustar imagen">
      <div className="space-y-4">
        <div
          ref={frame}
          className="relative mx-auto overflow-hidden rounded-lg bg-[var(--surface)] cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ aspectRatio: aspect, width: `min(100%, calc(55dvh * ${aspect}))` }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !img) return;
            const fw = e.currentTarget.getBoundingClientRect().width; // unidades = ancho del marco
            const n = layout(view.zoom, d.x + (e.clientX - d.px) / fw, d.y + (e.clientY - d.py) / fw);
            setView({ zoom: view.zoom, x: n.x, y: n.y });
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {l && (
            // eslint-disable-next-line @next/next/no-img-element -- vista local (blob:) antes de subir
            <img src={img.url} alt="" draggable={false} className="absolute max-w-none pointer-events-none"
              style={{ width: `${l.W * 100}%`, left: `${l.left * 100}%`, top: `${l.top * aspect * 100}%` }} />
          )}
          {!img && <p className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">{failed === file ? 'El archivo no es una imagen válida.' : 'Cargando…'}</p>}
        </div>

        <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <ZoomIn className="h-4 w-4 shrink-0" />
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={view.zoom} disabled={!img} aria-label="Zoom"
            onChange={(e) => { const z = Number(e.target.value); setZoom(() => z); }} className="w-full accent-[var(--primary)]" />
        </label>
        <p className="text-xs text-[var(--muted)]">Arrastra la imagen para elegir qué parte se ve.</p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={confirm} disabled={!img}>Usar recorte</Button>
        </div>
      </div>
    </Modal>
  );
}
