'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // el clic en el fondo llega al <dialog>; los clics en el contenido llegan a sus hijos
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      // m-auto: el reset de Tailwind quita el margin:auto con que el navegador centra el dialog
      className="m-auto backdrop:bg-black/50 bg-[var(--background)] text-[var(--text)] rounded-2xl border border-[var(--border)] shadow-xl p-0 w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <button onClick={onClose} className="ml-auto text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--surface)]">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
