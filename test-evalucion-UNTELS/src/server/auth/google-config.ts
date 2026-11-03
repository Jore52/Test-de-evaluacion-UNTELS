import { Google } from 'arctic';

export const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const googleClient = () =>
  new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${appUrl()}/api/auth/google/callback`);
export const loginRedirect = (code?: string) =>
  Response.redirect(`${appUrl()}/login${code ? `?e=${code}` : ''}`, 302);
export const OAUTH_COOKIE = { httpOnly: true, sameSite: 'lax', path: '/api/auth', maxAge: 600, secure: appUrl().startsWith('https') } as const;
export const sheetsClient = () =>
  new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${appUrl()}/api/sheets/callback`);
export const SHEETS_COOKIE = { ...OAUTH_COOKIE, path: '/api/sheets' } as const;
export const sheetsRedirect = (id: string, code: string) =>
  Response.redirect(`${appUrl()}/instrumento/${encodeURIComponent(id)}?sheets=${encodeURIComponent(code)}`, 303);
// Guarda CSRF explícita para POST de formularios propios (además de SameSite=lax en la sesión).
export const sameOrigin = (req: Request) => req.headers.get('origin') === new URL(appUrl()).origin;
