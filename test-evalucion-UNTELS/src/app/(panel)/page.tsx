'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import InstrumentCard from '@/components/dashboard/InstrumentCard';
import RecentInstruments from '@/components/dashboard/RecentInstruments';
import { Instrument } from '@/lib/types';
import { loadInstruments, createInstrument } from '@/lib/storage';
import { useCanManage } from '@/context/UserContext';

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canManage = useCanManage();

  useEffect(() => {
    loadInstruments()
      .then(setInstruments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const filtered = instruments.filter((inst) =>
    inst.title.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by updatedAt desc
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const newInst = await createInstrument();
      router.push(`/instrumento/${newInst.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  const handleSelectInstrument = (id: string) => {
    router.push(`/instrumento/${id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header searchValue={search} onSearchChange={setSearch} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-3 flex-1">
            <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
              Instrumentos recientes
            </h2>
            <RecentInstruments instruments={sorted} onSelect={handleSelectInstrument} />
          </div>
          {canManage && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={handleCreateNew}
              disabled={creating}
              size="md"
            >
              Crear instrumento
            </Button>
          )}
        </div>

        {/* Divider */}
        <hr className="border-[var(--border)] mb-6" />

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{error}</p>}

        {/* Grid */}
        {!loaded ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <p className="text-[var(--muted)]">
                {search
                  ? 'No se encontraron instrumentos con ese nombre.'
                  : 'Aún no hay instrumentos creados. ¡Crea tu primero!'}
              </p>
              {!search && canManage && (
                <Button onClick={handleCreateNew} disabled={creating} icon={<Plus className="h-4 w-4" />}>
                  Crear instrumento
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((inst) => (
              <InstrumentCard
                key={inst.id}
                instrument={inst}
                onClick={() => handleSelectInstrument(inst.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
