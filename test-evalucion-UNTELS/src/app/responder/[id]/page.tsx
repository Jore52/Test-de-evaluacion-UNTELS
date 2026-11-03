import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getDb } from '@/db/client';
import { getPublished } from '@/server/instruments';
import LiveSurvey from './LiveSurvey';
import UntelsBanner from '@/components/layout/UntelsBanner';

export const metadata: Metadata = { title: 'Responder instrumento' };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const inst = await getPublished(getDb(), id);
  if (!inst) notFound();
  return <LiveSurvey instrument={inst} />;
}

export default function Page(props: PageProps<'/responder/[id]'>) {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <UntelsBanner />
      <div className="px-3 py-4 sm:p-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 sm:p-8 shadow-sm">
        <Suspense fallback={<div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /></div>}>
          <Content params={props.params} />
        </Suspense>
      </div>
      </div>
    </main>
  );
}
