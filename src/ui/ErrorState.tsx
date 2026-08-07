import { Button } from './Button';

export interface ErrorStateProps {
  /** Already-resolved Persian text. */
  title: string;
  /**
   * GENERIC by contract (NFR-S7, BR-U1-53, SECURITY-09).
   *
   * No stack trace, no internal path, no store internals, no framework
   * version. Detail goes to the console in development only. There is
   * deliberately no prop for passing an exception message through to the user.
   */
  message: string;
  retryLabel?: string | undefined;
  onRetry?: () => void;
  'data-testid'?: string | undefined;
}

export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  'data-testid': testId,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid={testId ?? 'error-state'}
      className="flex flex-col items-center gap-3 px-6 py-10 text-center"
    >
      <span aria-hidden="true" className="text-3xl">
        ⚠️
      </span>
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className="max-w-sm text-text-secondary">{message}</p>

      {onRetry && retryLabel !== undefined ? (
        <Button variant="secondary" onClick={onRetry} data-testid="error-state-retry-button">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
