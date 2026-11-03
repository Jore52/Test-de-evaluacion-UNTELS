import { adminRoute } from '@/server/admin-route';
import { getInstrument } from '@/server/instruments';
import { validateAnswers } from '@/lib/answers';
import { computeResult } from '@/lib/scoring';
import { jpegResponse, renderResultJpeg } from '@/server/result-image';

// Imagen de la vista previa: usa el borrador y no guarda nada.
export const POST = adminRoute<{ id: string }>('view', async ({ db, params, body }) => {
  const inst = await getInstrument(db, params.id);
  const b = body as { name?: unknown; answers?: unknown };
  const { answers } = validateAnswers(inst, b.answers);
  return jpegResponse(await renderResultJpeg({
    title: inst.title, name: typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 120) : 'Vista previa',
    completedAt: new Date(), result: computeResult(inst, answers), finalMessage: inst.generalConfig.finalMessage,
  }));
});
