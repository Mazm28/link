import { toPersianDigits } from '@core/rules/persianText';

export type BadgeVariant = 'default' | 'verified' | 'count' | 'warning';

export interface BadgeProps {
  variant?: BadgeVariant | undefined;
  /** Already-resolved Persian text. Ignored when `count` is given. */
  label?: string | undefined;
  /** Rendered with Persian digits and capped — see below. */
  count?: number | undefined;
  'data-testid'?: string | undefined;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-surface-sunken text-text-secondary',
  verified: 'bg-verified text-white',
  count: 'bg-danger text-white',
  warning: 'bg-warning-subtle text-warning',
};

/** Above this, the exact number stops mattering and the width starts to. */
const COUNT_CAP = 99;

export function Badge({ variant = 'default', label, count, 'data-testid': testId }: BadgeProps) {
  const text =
    count !== undefined
      ? count > COUNT_CAP
        ? `+${toPersianDigits(COUNT_CAP)}`
        : toPersianDigits(count)
      : (label ?? '');

  return (
    <span
      data-testid={testId}
      className={[
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        count !== undefined ? 'min-w-5' : '',
        VARIANTS[variant],
      ].join(' ')}
    >
      {text}
    </span>
  );
}
