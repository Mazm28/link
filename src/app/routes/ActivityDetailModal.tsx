import type { ActivityView } from '@core/domain';
import { formatJalali } from '@core/rules/jalali';
import { toPersianDigits } from '@core/rules/persianText';
import { Avatar } from '@ui/Avatar';
import { Badge } from '@ui/Badge';
import { Chip } from '@ui/Chip';
import { Modal } from '@ui/Modal';
import { RatingStars } from '@ui/RatingStars';
import { IconAround, IconCalendar, IconMapPin } from '@ui/icons';
import { useI18n } from '../I18nProvider';

export interface ActivityDetailModalProps {
  activity: ActivityView | null;
  onClose: () => void;
  categoryName: (id: string) => string;
  categoryIcon: (id: string) => string;
  neighborhoodName: (id: string) => string;
  tintClass: (seed: string) => string;
}

/**
 * The detail view, over a dimmed page.
 *
 * This is where the HOST reappears. The card omits them because at
 * four-across a name and a rating crowd out the three facts that drive a
 * scan — but this is the moment someone decides whether to contact a
 * stranger, and reputation is the main thing they have to go on. Leaving it
 * out here would be a safety regression, not a layout choice.
 *
 * Full description, every category, capacity and interest count all live here
 * rather than on the card: the card answers "is this worth opening", this
 * answers "am I going".
 */
export function ActivityDetailModal({
  activity,
  onClose,
  categoryName,
  categoryIcon,
  neighborhoodName,
  tintClass,
}: ActivityDetailModalProps) {
  const { t } = useI18n();
  if (activity === null) return null;

  const when = formatJalali(new Date(activity.startsAt), 'd MMMM yyyy — HH:mm');
  const isPast = activity.derivedState === 'past';
  const isCancelled = activity.derivedState === 'cancelled';
  const primaryCategory = String(activity.categoryIds[0] ?? '');
  const hasExactAddress = 'exactAddress' in activity;

  return (
    <Modal open onClose={onClose} data-testid="activity-detail">
      <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto">
        {/* ---- image ------------------------------------------------------
         * AS-04 fixes Round 1 at a single optional image, not a gallery, so
         * this is one slot rather than a carousel. When it is empty the tinted
         * placeholder is the composed state, not a broken one. */}
        <div
          className={[
            '-mx-5 -mt-5 flex aspect-[16/9] items-center justify-center overflow-hidden',
            activity.imageUrl === undefined ? tintClass(primaryCategory) : '',
          ].join(' ')}
        >
          {activity.imageUrl === undefined ? (
            <span aria-hidden="true" className="text-6xl opacity-90">
              {categoryIcon(primaryCategory)}
            </span>
          ) : (
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="size-full object-cover"
              data-testid="activity-detail-image"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCancelled ? <Badge variant="count" label={t('date.cancelled')} /> : null}
          {isPast && !isCancelled ? <Badge variant="warning" label={t('date.past')} /> : null}
          {activity.authorKind === 'venue' ? (
            <Badge variant="verified" label={t('venue.verified')} />
          ) : null}
        </div>

        <h2 className="text-xl font-bold text-text" data-testid="activity-detail-title">
          {activity.title}
        </h2>

        {/* ---- facts ------------------------------------------------------ */}
        <dl className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-surface-muted p-3 text-sm">
          <div className="flex items-center gap-2">
            <dt className="sr-only-text">{t('date.heldOn')}</dt>
            <IconCalendar className="size-4 text-text-muted" />
            <dd className="text-text">{when.ok ? when.value : '—'}</dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="sr-only-text">{t('location.label')}</dt>
            {hasExactAddress ? (
              <>
                <IconMapPin className="size-4 text-text-muted" />
                <dd className="text-text">{activity.exactAddress}</dd>
              </>
            ) : (
              <>
                {/* INV-2 again: the key is absent, so there is nothing here to
                 * reveal even on the detail view. The projection decided this
                 * at the repository boundary, not the component. */}
                <IconAround className="size-4 text-brand" />
                <dd className="text-text">
                  {t('location.around', {
                    neighborhood: neighborhoodName(String(activity.neighborhoodId)),
                  })}
                </dd>
              </>
            )}
          </div>

          {activity.capacity !== undefined ? (
            <div className="flex items-center gap-2">
              <dt className="text-text-muted">{t('demo.capacity')}</dt>
              {/* FR-14: informational only. Nothing enforces it and there is no
               * roster — the host coordinates externally. */}
              <dd className="text-text">
                {t('demo.capacityValue', { count: toPersianDigits(activity.capacity) })}
              </dd>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <dt className="sr-only-text">{t('nav.requests')}</dt>
            <dd className="text-text-secondary">
              {t('demo.requests', { count: toPersianDigits(activity.requestCount) })}
            </dd>
          </div>
        </dl>

        {/* ---- description ------------------------------------------------ */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-text-muted">{t('demo.aboutActivity')}</h3>
          {/* Rendered as a React text node, so it is escaped by construction.
           * `dangerouslySetInnerHTML` is banned by lint (NFR-S2). */}
          <p
            className="whitespace-pre-line text-text-secondary"
            data-testid="activity-detail-description"
          >
            {activity.description}
          </p>
        </section>

        {activity.categoryIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activity.categoryIds.map((id) => {
              const name = categoryName(String(id));
              return name === '' ? null : (
                <Chip key={id} label={name} icon={categoryIcon(String(id))} />
              );
            })}
          </div>
        ) : null}

        {/* ---- host ------------------------------------------------------- */}
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <Avatar
            name={activity.author.displayName}
            size="md"
            {...(activity.author.avatarId === undefined
              ? {}
              : { src: activity.author.avatarId })}
          />
          <div className="flex flex-1 flex-col">
            <span className="text-xs text-text-muted">{t('demo.host')}</span>
            <span className="font-medium text-text" data-testid="activity-detail-host">
              {activity.author.displayName}
            </span>
          </div>
          <RatingStars
            value={activity.author.rating.average}
            count={activity.author.rating.count}
            emptyLabel={t('rating.none')}
            size="sm"
          />
        </div>
      </div>
    </Modal>
  );
}
