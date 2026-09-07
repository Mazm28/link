import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  interactive?: boolean | undefined;
  onClick?: () => void;
  className?: string | undefined;
  'data-testid'?: string | undefined;
}

export function Card({
  children,
  interactive = false,
  onClick,
  className = '',
  'data-testid': testId,
}: CardProps) {
  const classes = [
    'rounded-[var(--radius-card)] border border-border bg-surface p-4',
    interactive ? 'cursor-pointer transition-shadow hover:shadow-md active:scale-[0.995]' : '',
    className,
  ].join(' ');

  // An interactive card is a real button, not a div with a click handler —
  // otherwise it is unreachable by keyboard and invisible to a screen reader
  // (NFR-U3).
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${classes} w-full text-start`}
        data-testid={testId}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={classes} data-testid={testId}>
      {children}
    </div>
  );
}
