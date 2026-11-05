'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const DELAY_MS = 5000;

/** Publicidad de admisión: ventana emergente con carrusel que aparece unos segundos después de ver el resultado. */
export default function AdCarousel({ images }: { images: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const many = images.length > 1;

  useEffect(() => {
    if (!images.length) return;
    const t = setTimeout(() => ref.current?.showModal(), DELAY_MS);
    return () => clearTimeout(t);
  }, [images.length]);

  if (!images.length) return null;
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);
  const close = () => ref.current?.close();
  const btn = 'absolute flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80';

  return (
    <dialog
      ref={ref}
      aria-label="Publicidad de admisión"
      // clic en el fondo cierra; la imagen y los botones son hijos, no llegan aquí
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onKeyDown={(e) => { if (many && e.key === 'ArrowLeft') go(-1); if (many && e.key === 'ArrowRight') go(1); }}
      className="m-auto overflow-visible bg-transparent p-0 backdrop:bg-black/70"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen propia de /api/images, cuadrada 1:1 */}
        <img src={images[i]} alt={`Publicidad de admisión ${i + 1} de ${images.length}`} className="block aspect-square w-[min(85dvh,calc(100vw-2rem))] rounded-xl object-cover" />
        <button type="button" onClick={close} aria-label="Cerrar publicidad" autoFocus className={`${btn} top-2 right-2`}>
          <X className="h-5 w-5" />
        </button>
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Imagen anterior" className={`${btn} left-2 top-1/2 -translate-y-1/2`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Imagen siguiente" className={`${btn} right-2 top-1/2 -translate-y-1/2`}>
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {images.map((src, n) => (
                <button key={src} type="button" onClick={() => setI(n)} aria-label={`Ver imagen ${n + 1}`} aria-current={n === i}
                  className={`h-2 rounded-full transition-all ${n === i ? 'w-5 bg-white' : 'w-2 bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
