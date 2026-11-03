'use client';

import { useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Check, Download, Link2, QrCode, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PublishInfoProps {
  instrumentId: string;
  onClose?: () => void;
}

export default function PublishInfo({ instrumentId, onClose }: PublishInfoProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const surveyUrl = `${baseUrl}/responder/${instrumentId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = surveyUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [surveyUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qr-instrumento-${instrumentId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [instrumentId]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-4 shadow-xl animate-in slide-in-from-top-2 fade-in duration-300">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Instrumento publicado
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-0.5 rounded-md hover:bg-[var(--surface)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Link section */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          <Link2 className="h-3.5 w-3.5" />
          Link para encuestados
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={surveyUrl}
            className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] outline-none select-all truncate"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            size="sm"
            variant={copied ? 'primary' : 'secondary'}
            onClick={handleCopy}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </Button>
        </div>
      </div>

      {/* QR Code section */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          <QrCode className="h-3.5 w-3.5" />
          Código QR
        </label>
        <div className="flex items-center gap-3">
          <div
            ref={qrRef}
            className="rounded-lg border border-[var(--border)] bg-white p-2 inline-block shrink-0"
          >
            <QRCodeCanvas
              value={surveyUrl}
              size={96}
              level="M"
              marginSize={1}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadQR}
              icon={<Download className="h-4 w-4" />}
            >
              Descargar QR
            </Button>
            <p className="text-xs text-[var(--muted)]">
              Descarga como imagen PNG
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

