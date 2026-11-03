'use client';

import { useActionState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { emergencyAction } from './actions';

export function EmergencyForm() {
  const [state, action, pending] = useActionState(emergencyAction, null);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Input label="Usuario" name="username" defaultValue="emergencia" autoComplete="username" required />
      <Input label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <Input label="Código de 6 dígitos" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required />
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Verificando…' : 'Ingresar'}</Button>
    </form>
  );
}
