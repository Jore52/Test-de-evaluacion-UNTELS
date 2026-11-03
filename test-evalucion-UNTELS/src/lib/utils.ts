export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  'short-text': 'Texto corto',
  'long-text': 'Texto largo',
  'single-choice': 'Opciones',
  'multi-choice': 'Opción múltiple',
  'scale': 'Escala',
  'point-scale': 'Escala puntual',
};
