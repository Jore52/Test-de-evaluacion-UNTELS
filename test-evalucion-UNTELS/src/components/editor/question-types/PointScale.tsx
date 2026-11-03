'use client';

import { ScaleConfig } from '@/lib/types';
import ScaleLayout from '@/components/survey/ScaleLayout';

interface PointScaleProps {
  config: ScaleConfig;
  onChange: (config: ScaleConfig) => void;
}

export default function PointScale({ config, onChange }: PointScaleProps) {
  const range = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  const updatePointLabel = (point: number, label: string) => {
    onChange({
      ...config,
      pointLabels: { ...config.pointLabels, [point]: label },
    });
  };

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

      {/* Scale preview with individual labels */}
      <div className="pt-2">
        <ScaleLayout
          wide
          items={range.map((n) => ({
            key: n,
            top: (
              <input
                type="text"
                value={config.pointLabels[n] || ''}
                onChange={(e) => updatePointLabel(n, e.target.value)}
                placeholder={`Texto ${n}`}
                className="w-full px-1 text-xs text-center text-[var(--primary)] font-medium bg-transparent outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] transition-colors placeholder:text-[var(--muted)]/50 min-h-[2rem]"
              />
            ),
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
