export async function shareOrDownload(blob: Blob, filename: string, nav: Navigator = navigator): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return 'shared'; } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared'; // el alumno cerró el panel: no descargar
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000); // revocar al instante cancela la descarga en algunos navegadores
  return 'downloaded';
}
