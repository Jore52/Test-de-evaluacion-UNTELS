'use client';

import { useInstrument } from '@/context/InstrumentContext';
import Switch from '@/components/ui/Switch';
import { Settings } from 'lucide-react';
import SheetsConfig from './SheetsConfig';

export default function GeneralConfig() {
  const { instrument, dispatch } = useInstrument();
  const { generalConfig } = instrument;

  const updateConfig = (updates: Partial<typeof generalConfig>) => {
    dispatch({ type: 'UPDATE_GENERAL_CONFIG', payload: updates });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-[var(--primary)]" />
          <h3 className="text-lg font-semibold text-[var(--text)]">Configuración General</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Opciones generales del instrumento que afectan la experiencia del encuestado.
        </p>
      </div>

      {/* Response settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
          Respuestas
        </h4>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {/* Single response */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-[var(--text)]">Solo puede responder una vez</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Si está activado, solo se puede responder una vez. Si está desactivado, se puede modificar la respuesta.
              </p>
            </div>
            <Switch
              checked={generalConfig.singleResponse}
              onChange={(checked) => updateConfig({ singleResponse: checked })}
            />
          </div>
        </div>
      </div>

      {/* Final message */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
          Mensaje Final
        </h4>
        <p className="text-xs text-[var(--muted)]">
          Este mensaje se mostrará al encuestado después de enviar sus respuestas.
        </p>
        <input
          type="text"
          aria-label="Subtítulo del mensaje final"
          value={generalConfig.finalTitle}
          onChange={(e) => updateConfig({ finalTitle: e.target.value })}
          placeholder="Subtítulo (por defecto: ¡Test completado!)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors placeholder:text-[var(--muted)]"
        />
        <textarea
          aria-label="Mensaje final"
          value={generalConfig.finalMessage}
          onChange={(e) => updateConfig({ finalMessage: e.target.value })}
          placeholder="Escribe el mensaje que verá el encuestado al finalizar..."
          rows={4}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors resize-y placeholder:text-[var(--muted)]"
        />
      </div>

      <SheetsConfig />
    </div>
  );
}

