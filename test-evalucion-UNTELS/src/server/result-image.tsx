import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { LEVEL_LABELS, type Level, type SurveyResult } from '@/lib/scoring';

// Noto Sans (.woff, soportado por satori) para tildes y ñ. Rutas literales para que el trazado de archivos las incluya.
const font = (w: 400 | 700) => readFileSync(path.join(process.cwd(), 'node_modules/@fontsource/noto-sans/files', `noto-sans-latin-${w}-normal.woff`));
let fonts: { name: string; data: Buffer; weight: 400 | 700 }[] | undefined;
const getFonts = () => (fonts ??= [{ name: 'Noto Sans', data: font(400), weight: 400 }, { name: 'Noto Sans', data: font(700), weight: 700 }]);
let logo: string | undefined;
const getLogo = () => (logo ??= `data:image/png;base64,${readFileSync(path.join(process.cwd(), 'public/Logo_UNTELS.png')).toString('base64')}`);

const LEVEL_COLOR: Record<Level, string> = { low: '#b45309', mid: '#1d4ed8', high: '#047857' };

export type ResultImageInput = { title: string; name: string; completedAt: Date; result: SurveyResult; finalMessage: string };

export async function renderResultJpeg({ title, name, completedAt, result, finalMessage }: ResultImageInput): Promise<Buffer> {
  const date = completedAt.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
  const areas = [...result.areas].sort((a, b) => (b.percentile ?? b.score) - (a.percentile ?? a.score));
  const png = await new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: 'flex', flexDirection: 'column', padding: 72, background: '#ffffff', color: '#0f172a', fontFamily: 'Noto Sans' }}>
        <div style={{ display: 'flex', background: '#00357f', borderRadius: 16, padding: '20px 28px', marginBottom: 32, alignSelf: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori solo entiende <img> */}
          <img src={getLogo()} alt="" width={440} height={100} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '4px solid #0f766e', paddingBottom: 32 }}>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{title.slice(0, 90)}</div>
          <div style={{ fontSize: 28, color: '#64748b', marginTop: 8 }}>{date}</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 48, color: '#0f766e' }}>{name.slice(0, 60)}</div>
        {result.isTest ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32 }}>
            {areas.slice(0, 12).map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: a.color, marginRight: 18 }} />
                <div style={{ flex: 1, fontSize: 32 }}>{a.name}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: LEVEL_COLOR[a.level] }}>{LEVEL_LABELS[a.level]}</div>
              </div>
            ))}
            {result.careers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>Carreras recomendadas</div>
                {result.careers.slice(0, 5).map((c) => <div key={c} style={{ fontSize: 30, marginTop: 10 }}>{`• ${c}`}</div>)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 34, marginTop: 40, color: '#334155' }}>{finalMessage.slice(0, 400)}</div>
        )}
      </div>
    ),
    { width: 1080, height: 1350, fonts: getFonts() },
  ).arrayBuffer();
  return sharp(Buffer.from(png)).flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
}

export const jpegResponse = (buf: Buffer) =>
  new Response(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } });
