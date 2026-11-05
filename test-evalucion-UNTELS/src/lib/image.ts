import { api } from './storage';

/** Codifica el canvas como data URL webp, o jpeg si el navegador no codifica webp. */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL('image/webp', 0.8);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Encuadre de una imagen w×h que cubre un marco de ancho 1 y alto 1/aspect (unidades = ancho del marco).
 * zoom >= 1 sobre la escala mínima que cubre; (x, y) es el desplazamiento desde el centro, limitado
 * para que la imagen nunca deje bordes vacíos.
 */
export function cropLayout(w: number, h: number, aspect: number, zoom: number, x: number, y: number) {
  const scale = Math.max(1 / w, 1 / aspect / h) * zoom;
  const W = w * scale, H = h * scale;
  const mx = (W - 1) / 2, my = (H - 1 / aspect) / 2;
  x = Math.min(mx, Math.max(-mx, x));
  y = Math.min(my, Math.max(-my, y));
  const left = (1 - W) / 2 + x, top = (1 / aspect - H) / 2 + y;
  // rect = parte de la imagen original (en px) que queda dentro del marco
  return { x, y, W, left, top, rect: [-left / scale, -top / scale, 1 / scale, 1 / aspect / scale] as const };
}

/** Texto blanco u oscuro según la luminancia del color de fondo (#rrggbb). */
export const textOn = (hex: string) =>
  parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114 > 150 ? '#111827' : '#ffffff';

/** Sube una imagen ya codificada a /api/images; devuelve su enlace. */
export async function uploadDataUrl(dataUrl: string): Promise<string> {
  return (await api<{ url: string }>('/api/images', { method: 'POST', body: JSON.stringify({ dataUrl }) })).url;
}
