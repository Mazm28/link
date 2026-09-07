/** Staggered widths so the placeholder reads as text rather than as bars. */
const LINE_WIDTHS = ['w-11/12', 'w-4/5', 'w-2/3', 'w-3/4'] as const;

export interface SkeletonProps {
  /** Number of placeholder rows. */
  lines?: number | undefined;
  variant?: 'text' | 'card' | 'avatar' | undefined;
  'data-testid'?: string | undefined;
}

/**
 * Shaped like the content it replaces, so the layout does not jump when real
 * data arrives. Mock latency (BR-U1-45) exists partly so this is actually
 * visible during development rather than a component nobody ever sees.
 */
export function Skeleton({ lines = 3, variant = 'text', 'data-testid': testId }: SkeletonProps) {
  if (variant === 'avatar') {
    return (
      <span
        aria-hidden="true"
        data-testid={testId}
        className="inline-block size-11 animate-pulse rounded-full bg-surface-sunken"
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        aria-hidden="true"
        data-testid={testId}
        className="animate-pulse rounded-[var(--radius-card)] border border-border p-4"
      >
        <div className="mb-3 h-4 w-2/3 rounded bg-surface-sunken" />
        <div className="mb-2 h-3 w-full rounded bg-surface-sunken" />
        <div className="h-3 w-4/5 rounded bg-surface-sunken" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" data-testid={testId} className="flex animate-pulse flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        // Widths come from utility classes rather than an inline `style`
        // attribute. NFR-S3 requires a CSP with no `unsafe-inline`, and inline
        // style attributes are exactly what `style-src-attr` blocks — one
        // decorative shimmer is not worth weakening the policy for.
        <div
          key={i}
          className={`h-3 rounded bg-surface-sunken ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
        />
      ))}
    </div>
  );
}

export interface LoadingStateProps {
  /** Already-resolved Persian text, announced to assistive technology. */
  label: string;
  'data-testid'?: string | undefined;
}

export function LoadingState({ label, 'data-testid': testId }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId ?? 'loading-state'}
      className="flex flex-col items-center gap-3 py-10 text-text-muted"
    >
      <span className="inline-block size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
