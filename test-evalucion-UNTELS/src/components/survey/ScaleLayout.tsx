import type { CSSProperties, ReactNode } from 'react';

interface ScaleLayoutProps {
  items: { key: number; box: ReactNode; top?: ReactNode }[];
  /** Escala: etiquetas de inicio y fin en una fila aparte (texto o campos editables). */
  start?: ReactNode;
  end?: ReactNode;
  /** Escala puntual: columnas más anchas para el texto de cada cuadro. */
  wide?: boolean;
}

/**
 * Reparte los cuadros en el ancho disponible (menos cuadros = más separación), con un tope
 * por cuadro para que no queden muy separados. En contenedores angostos (celular, < 28rem)
 * caben 4 cuadros; desde el 5º se desliza. Container queries: sirve también en la vista previa.
 */
export default function ScaleLayout({ items, start, end, wide }: ScaleLayoutProps) {
  const col = wide ? 'w-[25cqw] @md:w-20' : 'w-[25cqw] @md:w-14';
  // El tope va en un hijo: si estuviera en el @container, achicaría la medición y activaría el modo celular
  const cap = { '--scale-max': `${Math.max(items.length, 4) * (wide ? 7 : 5)}rem` } as CSSProperties;
  return (
    <div className="@container">
    <div className="overflow-x-auto pb-2 @md:max-w-(--scale-max)" style={cap}>
      <div className="w-max min-w-full">
        {(start || end) && (
          // w-0 + min-w-full: el texto largo no ensancha la fila, se parte en líneas
          <div className="flex justify-between gap-4 mb-2 w-0 min-w-full text-xs text-[var(--primary)] font-medium leading-tight">
            <div className="text-left flex-1 min-w-0 [overflow-wrap:anywhere]">{start}</div>
            <div className="text-right flex-1 min-w-0 [overflow-wrap:anywhere]">{end}</div>
          </div>
        )}
        <div className="flex justify-between items-end">
          {/* celular: cada columna = 1/4 del ancho real, así caben 4 y desde el 5º se desliza */}
          {items.map(({ key, box, top }) => (
            <div key={key} className={`${col} shrink-0 flex flex-col items-center gap-2`}>
              {top}
              {box}
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
