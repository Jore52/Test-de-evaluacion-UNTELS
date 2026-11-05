import { NextResponse } from 'next/server';
import { getDb, type Db } from '@/db/client';
import { PublicError } from './errors';
import { getCurrentUser } from './auth/current-user';
import { can } from './auth/sessions';
import { sameOrigin } from './auth/google-config';
import type { AdminUser } from './auth/types';

const STATUS = { not_found: 404, not_available: 409, invalid: 400, forbidden: 403 } as const;
const MAX_BODY = 1024 * 1024; // un instrumento grande cabe holgado (las imágenes van aparte)

/** Ruta JSON del panel: sesión obligatoria, permiso, CSRF (mismo origen) en escrituras y mapeo de errores. */
export function adminRoute<P = Record<string, string>>(
  need: 'view' | 'manage',
  run: (ctx: { db: Db; user: AdminUser; params: P; body: unknown; req: Request }) => Promise<unknown>,
) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
      if (!can(user, need)) return NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 });
      let body: unknown;
      if (req.method !== 'GET') {
        if (!sameOrigin(req)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
        const text = await req.text();
        if (text.length > MAX_BODY) return NextResponse.json({ error: 'Contenido demasiado grande.' }, { status: 413 });
        try { body = text ? JSON.parse(text) : {}; } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
      }
      const out = await run({ db: getDb(), user, params: await ctx.params, body, req });
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof PublicError) return NextResponse.json({ error: e.message }, { status: STATUS[e.code] });
      console.error(e);
      return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
    }
  };
}
