import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/current-user';
import { googleConfigured } from '@/server/auth/google-config';
import LoginShell from '@/components/layout/LoginShell';

const MENSAJES: Record<string, string> = {
  google_no_configurado: 'El acceso con Google aún no está configurado.',
  estado_invalido: 'La solicitud de acceso expiró. Inténtalo de nuevo.',
  no_verificado: 'Tu correo de Google no está verificado.',
  no_autorizado: 'Tu correo no está autorizado. Pide acceso a un administrador.',
  error: 'No pudimos iniciar tu sesión. Inténtalo de nuevo.',
};

async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getCurrentUser()) redirect('/');
  const { e } = await searchParams;
  const msg = e && Object.hasOwn(MENSAJES, e) ? MENSAJES[e] : null;
  const ok = googleConfigured();
  return (
    <LoginShell title="Iniciar sesión" subtitle="Ingresa con tu cuenta de Google autorizada.">
      {msg && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{msg}</p>}
      {ok ? (
        <a href="/api/auth/google" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-90">
          Ingresar con Google
        </a>
      ) : (
        <p className="text-sm text-[var(--muted)]">Google no está configurado. Usa el acceso de emergencia.</p>
      )}
      <Link href="/login/emergencia" className="block text-center text-xs text-[var(--muted)] underline">Acceso de emergencia</Link>
    </LoginShell>
  );
}

export default function Page(props: PageProps<'/login'>) {
  return <Suspense><Login searchParams={props.searchParams} /></Suspense>;
}
