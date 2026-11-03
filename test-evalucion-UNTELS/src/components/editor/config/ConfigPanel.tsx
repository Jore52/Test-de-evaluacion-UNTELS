'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import GeneralConfig from './GeneralConfig';
import Step1Areas from './Step1Areas';
import Step2Percentiles from './Step2Percentiles';
import Step3Levels from './Step3Levels';
import Step4Careers from './Step4Careers';
import { useInstrument } from '@/context/InstrumentContext';

const STEPS = [
  { id: 'general', label: 'Configuración General' },
  { id: 'areas', label: 'Paso 1: Áreas / Inteligencias' },
  { id: 'percentiles', label: 'Paso 2: Percentiles' },
  { id: 'levels', label: 'Paso 3: Niveles' },
  { id: 'careers', label: 'Paso 4: Carreras (opcional)' },
];

export default function ConfigPanel() {
  const [activeStep, setActiveStep] = useState('general');
  const { instrument } = useInstrument();

  const hasAreas = instrument.areas.length > 0;
  const hasPercentiles = instrument.percentiles.length > 0;

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Vertical tabs */}
      <div className="lg:w-64 shrink-0">
        <div className="sticky top-20">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 px-4">
            Configuración
          </h3>
          <Tabs
            tabs={STEPS}
            activeTab={activeStep}
            onTabChange={setActiveStep}
            orientation="vertical"
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
          {activeStep === 'general' && <GeneralConfig />}
          {activeStep === 'areas' && <Step1Areas />}
          {activeStep === 'percentiles' && (
            hasAreas ? <Step2Percentiles /> : <EmptyState message="Primero agrega al menos un área en el Paso 1." />
          )}
          {activeStep === 'levels' && (
            hasAreas && hasPercentiles ? <Step3Levels /> : <EmptyState message="Completa los Pasos 1 y 2 primero." />
          )}
          {activeStep === 'careers' && (
            hasAreas ? <Step4Careers /> : <EmptyState message="Primero agrega al menos un área en el Paso 1." />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--muted)]">{message}</p>
    </div>
  );
}
