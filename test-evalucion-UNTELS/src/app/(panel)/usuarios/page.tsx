'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { api } from '@/lib/storage';
import { useUser } from '@/context/UserContext';

interface Row { id: string; email: string; name: string; role: 'superadmin' | 'admin' | 'viewer'; active: boolean; lastLoginAt: string | null }
const ROLE: Record<Row['role'], string> = { superadmin: 'Emergencia', admin: 'Administrador', viewer: 'Solo lectura' };

export default function UsuariosPage() {
  const router = useRouter();
  const me = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('admin');
  const [error, setError] = useState<string | null>(null);

  const reload = () => api<Row[]>('/api/users').then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => { reload(); }, []);

  const act = (p: Promise<unknown>) => { setError(null); p.then(reload).catch((e: Error) => setError(e.message)); };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header showSearch={false} />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold text-[var(--text)]">Usuarios autorizados</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">Solo estos correos de Google pueden ingresar al panel.</p>
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600">{error}</p>}

        <Card>
          <form
            className="flex flex-col sm:flex-row gap-3 sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              act(api('/api/users', { method: 'POST', body: JSON.stringify({ email, role }) }).then(() => setEmail('')));
            }}
          >
            <div className="flex-1"><Input label="Correo de Google" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@gmail.com" /></div>
            <select
              aria-label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)]"
            >
              <option value="admin">Administrador</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <Button type="submit" icon={<UserPlus className="h-4 w-4" />}>Autorizar</Button>
          </form>
        </Card>

        <Card className="p-0 divide-y divide-[var(--border)]">
          {rows.map((u) => {
            const locked = u.role === 'superadmin' || u.id === me?.id;
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] break-all">{u.email}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {u.name || '—'} · último ingreso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-PE') : 'nunca'}
                  </p>
                </div>
                {locked ? (
                  <span className="text-xs text-[var(--muted)]">{ROLE[u.role]}{u.id === me?.id ? ' (tú)' : ''}</span>
                ) : (
                  <>
                    <select
                      aria-label={`Rol de ${u.email}`}
                      value={u.role}
                      onChange={(e) => act(api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }))}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--text)]"
                    >
                      <option value="admin">Administrador</option>
                      <option value="viewer">Solo lectura</option>
                    </select>
                    <Switch
                      checked={u.active}
                      onChange={(active: boolean) => act(api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active }) }))}
                    />
                  </>
                )}
              </div>
            );
          })}
        </Card>
      </main>
    </div>
  );
}
