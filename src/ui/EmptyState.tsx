import type { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Already-resolved Persian text. */
  title: string;
  message?: string | undefined;
  action?: { label: string; onClick: () => void };
  illustration?: ReactNode | undefined;
  'data-testid'?: string | undefined;
}

/**
 * A FIRST-CLASS PRIMITIVE, not an afterthought.
 *
 * Per personas.md, P2 will open an empty feed constantly in the first months
 * of a single-city launch. That makes the empty state a COMMON path and often
 * a first impression — not an edge case. NFR-U5 requires it to explain WHY it
 * is empty and offer a next step; a bare «نتیجه‌ای یافت نشد» tells someone the
 * product is dead when it is merely new.
 */
export function EmptyState({
  title,
  message,
  action,
  illustration,
  'data-testid': testId,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
      data-testid={testId ?? 'empty-state'}
    >
      {illustration !== undefined ? (
        <div aria-hidden="true" className="text-4xl opacity-60">
          {illustration}
        </div>
      ) : null}

      <h3 className="text-lg font-bold text-text">{title}</h3>
      {message !== undefined ? <p className="max-w-sm text-text-secondary">{message}</p> : null}

      {action ? (
        <Button variant="primary" onClick={action.onClick} data-testid="empty-state-action-button">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
