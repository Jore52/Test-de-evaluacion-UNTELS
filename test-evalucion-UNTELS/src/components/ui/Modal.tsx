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
      className="backdrop:bg-black/50 bg-[var(--background)] text-[var(--text)] rounded-2xl border border-[var(--border)] shadow-xl p-0 w-full max-w-lg"
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
