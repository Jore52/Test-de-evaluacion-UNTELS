// shortcut: no soporta celdas de Excel con saltos de línea (entre comillas); ampliar si aparecen.
export function parseGrid(text: string): string[][] {
  const rows = text.replace(/\r?\n$/, '').split(/\r?\n/);
  return rows.map((r) => r.split('\t'));
}

/** true si el texto pegado es un bloque de celdas (no un valor suelto). */
export const isGrid = (text: string) => /[\t\n]/.test(text.replace(/\r?\n$/, ''));

/** Número de una celda (acepta coma decimal); null si vacía o no numérica. */
export function toNum(cell: string): number | null {
  const s = cell.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Recorre el bloque pegado desde (row, col), sin salir de rows×cols. */
export function forEachCell(grid: string[][], row: number, col: number, rows: number, cols: number, fn: (r: number, c: number, cell: string) => void) {
  grid.forEach((line, i) => line.forEach((cell, j) => {
    const r = row + i, c = col + j;
    if (r < rows && c < cols) fn(r, c, cell);
  }));
}
