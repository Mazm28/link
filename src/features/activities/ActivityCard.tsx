import { Link } from 'react-router-dom';
import type { ActivityView } from '@core/domain';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { locationLabel } from './locationLabel';
import { Badge } from '@ui/Badge';

/**
 * ActivityCard — renders from `ActivityView` ONLY, never from `Activity`.
 *
 * That is what makes INV-2 and INV-5 structural at the component level: the
 * exact address and the coordinate are not in scope, so this file cannot leak
 * them by accident. A component cannot show what it was never given.
 */
export function ActivityCard({ activity }: { activity: ActivityView }) {
  /* INV-2 in one expression: `exactAddress` is either present — because this
   * viewer is allowed it — or the key is absent and the neighborhood name is
   * all there is to show. There is no third branch, and no "hidden" state. */
  const place = locationLabel(activity);

  const when = formatJalali(new Date(activity.startsAt), 'd MMMM yyyy — HH:mm');

  return (
    <article
      data-testid={`activity-card-${activity.id}`}
      className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
    >
      <Link to={`/activity/${activity.id}`} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {activity.derivedState === 'cancelled' && (
            <Badge variant="warning" label={t('activity.stateCancelled')} />
          )}
          {activity.authorKind === 'venue' && (
            <Badge variant="verified" label={t('venue.verified')} />
          )}
        </div>

        <h3 className="text-base font-semibold text-fg">{activity.title}</h3>

        {/* A description list, not two bare paragraphs.
         *
         * Carried over from U1's card: without the labels a screen-reader
         * user hears a date and a place name with nothing saying which is
         * which. `sr-only-text` keeps them out of the visual design, where
         * the layout already makes it obvious. */}
        <dl className="flex flex-col gap-1 text-sm text-fg-muted">
          <div>
            <dt className="sr-only-text">{t('date.heldOn')}</dt>
            <dd>{when.ok ? when.value : ''}</dd>
          </div>
          <div>
            <dt className="sr-only-text">{t('location.label')}</dt>
            <dd>{place}</dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}
