import type { RatingSummary } from '@core/domain';
import { t } from '@core/i18n';
import { RatingStars } from '@ui/RatingStars';

/**
 * US-53 / BR-U4-70…72 — a person's reputation, everywhere it appears.
 *
 * ⚠️ TWO THINGS THIS COMPONENT MUST NEVER DO, both enforced by the type it
 * takes rather than by remembering:
 *
 *   1. Show a COMMENT. `RatingSummary` has no comment field. Comments are
 *      stored and never displayed in Round 1 (BR-U4-72) — not a scope cut but
 *      a privacy rule: with few ratings, an unattributed comment plus a known
 *      activity roster frequently identifies its author, and an activity with
 *      three attendees leaves almost no ambiguity. Displaying them
 *      "anonymously" would break US-53 while appearing to satisfy it.
 *
 *   2. Attribute a rating to anyone. No author, no per-rating breakdown.
 *
 * Below the threshold — now 2, lowered from 3 by CR-07's round of answers —
 * `average` is `null` and this renders «عضو تازه» rather than a score. One
 * data point is not a reputation, and showing it as one is worse than showing
 * nothing.
 */
export function RatingSummaryBadge({
  summary,
  'data-testid': testId,
}: {
  summary: RatingSummary;
  'data-testid'?: string;
}) {
  if (summary.isNewMember || summary.average === null) {
    return (
      <span className="text-xs text-fg-muted" data-testid={testId ?? 'rating-new-member'}>
        {t('rating.newMember')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" data-testid={testId ?? 'rating-summary'}>
      <RatingStars value={summary.average} count={summary.count} size="sm" />
    </span>
  );
}
