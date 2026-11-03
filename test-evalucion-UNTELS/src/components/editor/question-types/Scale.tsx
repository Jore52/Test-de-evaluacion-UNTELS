'use client';

import { ScaleConfig } from '@/lib/types';
import ScaleLayout from '@/components/survey/ScaleLayout';

// field-sizing-content: crece en líneas como el texto final (en Firefox queda en 1 línea con scroll)
const labelInput = 'block w-full field-sizing-content resize-none bg-transparent outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] transition-colors placeholder:text-[var(--muted)]/60 text-xs text-[var(--primary)] font-medium leading-tight';

interface ScaleProps {
  config: ScaleConfig;
  onChange: (config: ScaleConfig) => void;
}

export default function Scale({ config, onChange }: ScaleProps) {
  const range = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  return (
    <div className="space-y-4">
      {/* Range config */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted)] font-medium">Mínimo</label>
          <input
            type="number"
            value={config.min}
            onChange={(e) => onChange({ ...config, min: parseInt(e.target.value) || 0 })}
            className="w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] text-center"
          />
        </div>
        <span className="text-[var(--muted)]">—</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted)] font-medium">Máximo</label>
          <input
            type="number"
            value={config.max}
            onChange={(e) => onChange({ ...config, max: parseInt(e.target.value) || 0 })}
            className="w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] text-center"
          />
        </div>
      </div>

      {/* Escala editable tal como se verá: las etiquetas se escriben sobre el 1er y último cuadro */}
      <div className="pt-2">
        <ScaleLayout
          start={
            <textarea
              rows={1}
              value={config.startLabel}
              onChange={(e) => onChange({ ...config, startLabel: e.target.value })}
              placeholder="Texto inicio"
              className={`${labelInput} text-left`}
            />
          }
          end={
            <textarea
              rows={1}
              value={config.endLabel}
              onChange={(e) => onChange({ ...config, endLabel: e.target.value })}
              placeholder="Texto final"
              className={`${labelInput} text-right`}
            />
          }
          items={range.map((n) => ({
            key: n,
            box: (
              <div className="h-11 w-11 shrink-0 rounded-lg border-2 border-[var(--border)] hover:border-[var(--primary)] flex items-center justify-center text-sm font-medium text-[var(--text)] cursor-pointer transition-colors bg-[var(--background)]">
                {n}
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}
