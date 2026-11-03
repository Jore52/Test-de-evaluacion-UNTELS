import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/current-user';
import LoginShell from '@/components/layout/LoginShell';
import { EmergencyForm } from './form';

async function Emergencia() {
  if (await getCurrentUser()) redirect('/');
  return (
    <LoginShell title="Acceso de emergencia" subtitle="Usuario, contraseña y código de tu app autenticadora.">
      <EmergencyForm />
      <Link href="/login" className="block text-center text-xs text-[var(--muted)] underline">Volver</Link>
    </LoginShell>
  );
}

export default function Page() {
  return <Suspense><Emergencia /></Suspense>;
}
