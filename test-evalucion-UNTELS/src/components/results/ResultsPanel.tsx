'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInstrument } from '@/context/InstrumentContext';
import { api, deleteResponses } from '@/lib/storage';
import { useCanManage } from '@/context/UserContext';
import { SurveyResponse } from '@/lib/types';
import ResultsIndividual from './ResultsIndividual';
import ResultsGeneral from './ResultsGeneral';
import ResultsDashboard from './ResultsDashboard';
import { Users, BarChart3, LayoutDashboard, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

type ResultsTab = 'individual' | 'general' | 'dashboard';

const TABS: { id: ResultsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'individual', label: 'Individual', icon: <Users className="h-4 w-4" /> },
  { id: 'general', label: 'General', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
];

export default function ResultsPanel({ onCount }: { onCount?: (n: number) => void }) {
  const { instrument } = useInstrument();
  const canManage = useCanManage();
  const [activeTab, setActiveTab] = useState<ResultsTab>('dashboard');

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchResponses = useCallback(() => {
    api<SurveyResponse[]>(`/api/instruments/${encodeURIComponent(instrument.id)}/responses`)
      .then((rs) => { setResponses(rs); onCount?.(rs.length); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [instrument.id, onCount]);
  useEffect(() => { fetchResponses(); }, [fetchResponses]);
  const reload = () => { setLoading(true); setError(null); fetchResponses(); };
  const deleteAll = async () => {
    if (!confirm(`¿Eliminar las ${responses.length} respuestas de este instrumento? No se puede deshacer (si hay hoja de Google vinculada, las filas ya enviadas se mantienen allí).`)) return;
    try {
      await deleteResponses(instrument.id);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    reload();
  };

  if (instrument.questions.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-[var(--muted)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Sin preguntas</h3>
        <p className="text-sm text-[var(--muted)]">
          Agrega preguntas al instrumento para ver los resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Resultados</h2>
          <p className="text-sm text-[var(--muted)]">
            {loading ? 'Cargando…' : `${responses.length} respuesta${responses.length !== 1 ? 's' : ''} recibidas`}
            <button onClick={reload} title="Actualizar" className="ml-2 inline-flex align-middle p-1 rounded text-[var(--muted)] hover:text-[var(--text)]">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {canManage && responses.length > 0 && (
              <button onClick={deleteAll} className="ml-3 inline-flex items-center gap-1 align-middle text-sm text-red-600 hover:underline">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar todas
              </button>
            )}
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Sub-tabs */}
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
        {activeTab === 'individual' && (
          <ResultsIndividual responses={responses} onDeleted={reload} />
        )}
        {activeTab === 'general' && (
          <ResultsGeneral responses={responses} />
        )}
        {activeTab === 'dashboard' && (
          <ResultsDashboard responses={responses} />
        )}
      </div>
    </div>
  );
}

