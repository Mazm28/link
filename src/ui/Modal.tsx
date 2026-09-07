import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Already-resolved Persian text. */
  title?: string | undefined;
  children: ReactNode;
  'data-testid'?: string | undefined;
}

export function Modal({ open, onClose, title, children, 'data-testid': testId }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid={testId}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-[var(--radius-card)] bg-surface p-5 shadow-xl"
      >
        {title !== undefined ? <h2 className="mb-3 text-lg font-bold text-text">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
