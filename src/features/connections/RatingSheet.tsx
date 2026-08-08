import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ActivityId, ProfileView } from '@core/domain';
import { t } from '@core/i18n';
import { useSession } from '@app/SessionProvider';
import { Button } from '@ui/Button';
import { RatingStars } from '@ui/RatingStars';
import { Sheet } from '@ui/Sheet';
import { TextArea } from '@ui/TextArea';
import { useConnectionService } from './useConnectionServices';

/**
 * ⚠️ US-51 / US-52 — rating, and being refused when ineligible.
 *
 * ⚠️ THIS SHEET DOES NOT DECIDE ELIGIBILITY. `canRate` does, and the WRITE
 * re-runs it (BR-U4-63). Hiding a control has prevented nothing — the
 * operation stays reachable by anyone who can reach the repository, and in
 * Round 2 the server runs the same function again. This component only renders
 * the answer.
 *
 * ⚠️ THE COMMENT IS STORED AND NEVER DISPLAYED (BR-U4-72). Not a scope cut but
 * a privacy rule: with few ratings, an unattributed comment plus a known
 * activity roster frequently identifies its author. The placeholder says
 * «برای خودت یادداشت کن…» precisely because there is no audience, and copy
 * implying one would be a lie about where the text goes.
 */
export function RatingSheet({
  activityId,
  subject,
  open,
  onClose,
}: {
  activityId: ActivityId;
  subject: ProfileView;
  open: boolean;
  onClose: () => void;
}) {
  const { viewerId } = useSession();
  const service = useConnectionService();
  const queryClient = useQueryClient();

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (viewerId === null || score === null) return;

    setSaving(true);
    const result = await service.submitRating({
      raterId: viewerId,
      subjectId: subject.id,
      activityId,
      score,
      ...(comment.trim() === '' ? {} : { comment: comment.trim() }),
    });
    setSaving(false);

    if (!result.ok) {
      setError(ratingRefusalMessage(result.error.code));
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['rateable'] });
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('rating.title').replace('{{name}}', subject.displayName)}
      data-testid="rating-sheet"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg">{t('rating.score')}</span>
          <RatingStars
            value={score}
            readonly={false}
            onChange={setScore}
            emptyLabel={t('rating.score')}
            data-testid="rating-stars"
          />
        </div>

        <TextArea
          label={t('rating.commentLabel')}
          placeholder={t('rating.commentPlaceholder')}
          value={comment}
          onChange={setComment}
          rows={3}
          maxLength={300}
          data-testid="rating-comment"
        />

        {error !== undefined && (
          <p className="text-sm text-danger" data-testid="rating-error">
            {error}
          </p>
        )}

        <Button
          onClick={() => void submit()}
          disabled={score === null || saving}
          data-testid="rating-submit"
        >
          {t('rating.submit')}
        </Button>
      </div>
    </Sheet>
  );
}

/**
 * ⚠️ Each refusal gets its OWN sentence (BR-U4-61).
 *
 * `not_confirmed_attendee` covers two genuinely different situations — the
 * host marked you absent, and the host has not reviewed attendance yet. They
 * are refused identically and must not READ identically: telling someone their
 * attendance was not confirmed, when in fact nobody has looked, accuses them of
 * not turning up when they did.
 *
 * This function cannot distinguish them from the code alone, so it uses the
 * gentler of the two. The screen that knows whether an `Attendance` row exists
 * is the one that can say more.
 */
function ratingRefusalMessage(code: string): string {
  switch (code) {
    case 'activity_not_past':
      return t('rating.refusedNotPast');
    case 'not_confirmed_attendee':
      return t('rating.refusedUnreviewed');
    case 'not_participant':
      return t('rating.refusedNotParticipant');
    case 'self_rating':
      return t('rating.refusedSelf');
    case 'already_rated':
      return t('rating.refusedAlready');
    default:
      return t('state.error.message');
  }
}
