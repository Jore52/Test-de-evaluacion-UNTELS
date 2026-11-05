import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { CareerRank, SurveyResult } from '@/lib/scoring';

// Noto Sans (.woff, soportado por satori) para tildes y ñ. Rutas literales para que el trazado de archivos las incluya.
const font = (w: 400 | 700) => readFileSync(path.join(process.cwd(), 'node_modules/@fontsource/noto-sans/files', `noto-sans-latin-${w}-normal.woff`));
let fonts: { name: string; data: Buffer; weight: 400 | 700 }[] | undefined;
const getFonts = () => (fonts ??= [{ name: 'Noto Sans', data: font(400), weight: 400 }, { name: 'Noto Sans', data: font(700), weight: 700 }]);
let logo: string | undefined;
const getLogo = () => (logo ??= `data:image/png;base64,${readFileSync(path.join(process.cwd(), 'public/Logo_UNTELS.png')).toString('base64')}`);

const BLUE = '#00357f';

export type ResultImageInput = { title: string; name: string; completedAt: Date; result: SurveyResult; careers: CareerRank[]; finalMessage: string };

const W = 1080, H = 1920; // formato historia: caben las 10 carreras con su descripción
const DESC_MAX = 240; // ~3 líneas a 19 px en el ancho útil; satori no recorta por líneas de forma fiable
const clip = (t: string) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > DESC_MAX ? `${s.slice(0, DESC_MAX - 1).trimEnd()}…` : s; };

export async function renderResultJpeg({ title, name, completedAt, result, careers, finalMessage }: ResultImageInput): Promise<Buffer> {
  const date = completedAt.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
  const top = careers.slice(0, 10);
  const png = await new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#0f172a', fontFamily: 'Noto Sans' }}>
        {/* franja institucional a todo el ancho */}
        <div style={{ width: W, display: 'flex', justifyContent: 'center', background: BLUE, padding: '22px 0', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori solo entiende <img> */}
          <img src={getLogo()} alt="" width={400} height={91} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 60px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: `4px solid ${BLUE}`, paddingBottom: 14, flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{title.slice(0, 90)}</div>
            <div style={{ fontSize: 21, color: '#64748b', marginTop: 2 }}>{date}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, marginTop: 14, color: BLUE, flexShrink: 0 }}>{name.slice(0, 60)}</div>
          {result.isTest && top.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
              <div style={{ display: 'flex', fontSize: 26, fontWeight: 700 }}>Carreras recomendadas</div>
              {top.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', marginTop: i === 0 ? 10 : 6, padding: i === 0 ? '12px 18px' : '4px 18px', flexShrink: 0, borderRadius: 16, background: i === 0 ? '#e8eef8' : '#ffffff', border: i === 0 ? `3px solid ${BLUE}` : '3px solid transparent' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? BLUE : '#e2e8f0', color: i === 0 ? '#ffffff' : '#334155', fontSize: 22, fontWeight: 700, marginRight: 20, flexShrink: 0 }}>{String(i + 1)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {i === 0 && <div style={{ fontSize: 18, fontWeight: 700, color: BLUE, marginBottom: 2 }}>CARRERA MÁS RECOMENDADA SEGÚN TU PERFIL</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: i === 0 ? 28 : 24, fontWeight: 700, maxWidth: 720 }}>{c.name.slice(0, 60)}</div>
                      <div style={{ fontSize: i === 0 ? 28 : 22, fontWeight: 700, color: BLUE }}>{`${c.match}%`}</div>
                    </div>
                    <div style={{ display: 'flex', height: 7, borderRadius: 4, background: '#e2e8f0', marginTop: 4 }}>
                      <div style={{ width: `${c.match}%`, height: 7, borderRadius: 4, background: BLUE }} />
                    </div>
                    {c.description && <div style={{ fontSize: 19, lineHeight: 1.25, color: '#475569', marginTop: 4 }}>{clip(c.description)}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 34, marginTop: 40, color: '#334155' }}>{finalMessage.slice(0, 400)}</div>
          )}
        </div>
      </div>
    ),
    { width: W, height: H, fonts: getFonts() },
  ).arrayBuffer();
  return sharp(Buffer.from(png)).flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
}

export const jpegResponse = (buf: Buffer) =>
  new Response(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } });
