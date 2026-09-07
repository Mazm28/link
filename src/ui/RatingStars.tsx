import { toPersianDigits } from '@core/rules/persianText';

export interface RatingStarsProps {
  /**
   * `null` means NO RATINGS YET, which is not the same as a score of zero.
   *
   * US-53: a new member showing five empty stars reads as "rated badly", and
   * in a product where reputation decides whether a stranger will meet you,
   * that misreading has real consequences. The empty case gets words, not
   * stars.
   */
  value: number | null;
  count?: number | undefined;
  /** Already-resolved Persian copy for the no-ratings case. */
  emptyLabel?: string | undefined;
  readonly?: boolean | undefined;
  onChange?: (score: number) => void;
  size?: 'sm' | 'md' | undefined;
  'data-testid'?: string | undefined;
}

const MAX = 5;

export function RatingStars({
  value,
  count,
  emptyLabel,
  readonly = true,
  onChange,
  size = 'md',
  'data-testid': testId,
}: RatingStarsProps) {
  if (value === null && readonly) {
    return (
      <span className="text-sm text-text-muted" data-testid={testId}>
        {emptyLabel}
      </span>
    );
  }

  const filled = Math.round(value ?? 0);
  const starSize = size === 'sm' ? 'text-sm' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-1" data-testid={testId}>
      {/* Stars fill from the inline-start edge, so under RTL they fill from
       * the right — the direction a Persian reader starts from. */}
      <span className={`inline-flex ${starSize}`} role={readonly ? 'img' : 'radiogroup'}>
        {Array.from({ length: MAX }, (_, i) => {
          const score = i + 1;
          const isFilled = score <= filled;
          if (readonly) {
            return (
              <span
                key={score}
                aria-hidden="true"
                className={isFilled ? 'text-warning' : 'text-border-strong'}
              >
                ★
              </span>
            );
          }
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange?.(score)}
              aria-label={toPersianDigits(score)}
              aria-pressed={isFilled}
              data-testid={testId === undefined ? undefined : `${testId}-${score}`}
              className={`touch-target ${isFilled ? 'text-warning' : 'text-border-strong'}`}
            >
              ★
            </button>
          );
        })}
      </span>

      {value !== null && count !== undefined ? (
        <span className="text-sm text-text-muted">
          {toPersianDigits(value)} ({toPersianDigits(count)})
        </span>
      ) : null}
    </span>
  );
}
