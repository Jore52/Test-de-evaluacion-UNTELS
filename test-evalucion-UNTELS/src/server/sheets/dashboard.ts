import type { SheetColumn } from '@/lib/sheet-columns';
import type { Instrument } from '@/lib/types';
import { SHEET_TAB } from './sync';

export const DASHBOARD_TAB = 'Dashboard';

const letter = (i: number): string => (i >= 26 ? letter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));
const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
// USER_ENTERED: un nombre que empiece con = + - @ se volvería fórmula; el apóstrofo lo deja como texto.
const label = (s: string) => (/^[=+\-@']/.test(s) ? `'${s}` : s);
// comodines de SEARCH (* ? ~) dentro de un nombre se escapan con ~
const wild = (s: string) => s.replace(/[*?~]/g, '~$&');

type Cell = string | number;

/** Fórmulas y gráficos de la pestaña Dashboard. Leen la pestaña Respuestas, así que se actualizan solos con cada envío. */
export function buildDashboardRequests(layout: SheetColumn[], inst: Instrument, sheetId: number) {
  const col = (key: string) => { const i = layout.findIndex((c) => c.key === key); return i < 0 ? null : letter(i); };
  const range = (c: string) => `'${SHEET_TAB}'!${c}2:${c}`;
  const at = (a1: string) => `'${DASHBOARD_TAB}'!${a1}`;
  const src = (r0: number, r1: number | undefined, c0: number, c1 = c0 + 1) =>
    ({ sourceRange: { sources: [{ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 }] } });
  const chart = (title: string, type: 'BAR' | 'COLUMN', r0: number, r1: number | undefined, c: number, series: number[], anchorRow: number) => ({
    addChart: { chart: {
      spec: { title, basicChart: {
        chartType: type, legendPosition: series.length > 1 ? 'BOTTOM_LEGEND' : 'NO_LEGEND', headerCount: 1,
        domains: [{ domain: src(r0, r1, c) }],
        series: series.map((s) => ({ series: src(r0, r1, s), targetAxis: type === 'BAR' ? 'BOTTOM_AXIS' : 'LEFT_AXIS' })),
        ...(series.length > 1 ? { stackedType: 'STACKED' } : {}),
      } },
      position: { overlayPosition: { anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: 9 } } },
    } },
  });

  const id = col('id') ?? 'A';
  const total = col('total');
  const rows: Cell[][] = [
    ['Total de respuestas', `=COUNTA(${range(id)})`],
    ['Puntaje promedio', total ? `=IFERROR(AVERAGE(${range(total)}), 0)` : ''],
  ];
  const requests: unknown[] = [];
  const isTest = inst.areas.length > 0 && inst.levels.length > 0;
  if (isTest) {
    rows.push([''], ['Área', 'Bajo', 'Medio', 'Alto']);
    const a0 = rows.length - 1;
    for (const a of inst.areas) {
      const c = col(`area:${a.id}`);
      rows.push([label(a.name), ...['Bajo', 'Medio', 'Alto'].map((l) => (c ? `=COUNTIF(${range(c)}, ${quote(l)})` : 0))]);
    }
    requests.push(chart('Niveles por área', 'BAR', a0, rows.length, 0, [1, 2, 3], 0));
    const cc = col('carreras');
    if (cc && inst.careers.length) {
      rows.push([''], ['Carrera recomendada', 'Respuestas']);
      const c0 = rows.length - 1;
      // coincidencia exacta entre "; ": "Ingeniería" no cuenta las filas de "Ingeniería Civil"
      for (const c of inst.careers) {
        rows.push([label(c.name), `=SUMPRODUCT(--(${range(cc)}<>""), --ISNUMBER(SEARCH(${quote(`; ${wild(c.name)};`)}, "; "&${range(cc)}&";")))`]);
      }
      requests.push(chart('Carreras recomendadas', 'BAR', c0, rows.length, 0, [1], 20));
    }
  }
  const fecha = col('fecha') ?? 'B';
  const perDay = `=QUERY(ARRAYFORMULA(LEFT(${range(fecha)},10)), "select Col1, count(Col1) where Col1 <> '' group by Col1 order by Col1 label Col1 'Día', count(Col1) 'Respuestas'", 0)`;
  requests.push(chart('Respuestas por día', 'COLUMN', 0, undefined, 6, [7], 40));
  return { values: [{ range: at('A1'), values: rows }, { range: at('G1'), values: [[perDay]] }], requests };
}
