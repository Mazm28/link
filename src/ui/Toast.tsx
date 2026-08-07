import { useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastProps {
  /** Already-resolved Persian text. */
  message: string;
  variant?: ToastVariant | undefined;
  /** Milliseconds. Ignored for errors — see below. */
  duration?: number | undefined;
  onDismiss: () => void;
  /** Already-resolved accessible name for the dismiss control. */
  dismissLabel?: string | undefined;
  'data-testid'?: string | undefined;
}

const VARIANTS: Record<ToastVariant, string> = {
  success: 'bg-success-subtle text-success border-success',
  error: 'bg-danger-subtle text-danger border-danger',
  info: 'bg-brand-subtle text-brand border-brand',
};

const DEFAULT_DURATION = 4000;

export function Toast({
  message,
  variant = 'info',
  duration = DEFAULT_DURATION,
  onDismiss,
  dismissLabel,
  'data-testid': testId,
}: ToastProps) {
  /* Errors persist until dismissed. An error that vanishes after four seconds
   * is one the user may never have finished reading — and in Persian, at a
   * comfortable reading speed, four seconds is about a sentence. */
  const autoDismiss = variant !== 'error';

  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [autoDismiss, duration, onDismiss]);

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      data-testid={testId ?? 'toast'}
      /* Enters from the inline-end edge: bottom-right in LTR, bottom-left in
       * RTL, without this component knowing which. */
      className={[
        'fixed bottom-20 end-4 z-50 flex items-center gap-3',
        'rounded-[var(--radius-control)] border px-4 py-3 shadow-lg',
        VARIANTS[variant],
      ].join(' ')}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        data-testid="toast-dismiss-button"
        className="text-current opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
