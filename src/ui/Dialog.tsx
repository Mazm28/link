import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button, type ButtonVariant } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Already-resolved Persian text. */
  title: string;
  message?: string | undefined;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant?: ButtonVariant | undefined;
  children?: ReactNode | undefined;
  'data-testid'?: string | undefined;
}

/** `Modal` plus a confirm/cancel pair — the shape U6 uses for block and report
 *  confirmations. */
export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  children,
  'data-testid': testId,
}: DialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} data-testid={testId}>
      {message !== undefined ? <p className="mb-4 text-text-secondary">{message}</p> : null}
      {children}

      {/* Confirm first in DOM order, so it sits at the inline-start edge —
       * which under RTL puts it on the right, where Persian reading order
       * expects the primary action (frontend-components.md §3.2). */}
      <div className="mt-5 flex gap-2">
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          fullWidth
          data-testid={testId === undefined ? undefined : `${testId}-confirm`}
        >
          {confirmLabel}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          fullWidth
          data-testid={testId === undefined ? undefined : `${testId}-cancel`}
        >
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}
