import type { ActivityView } from '@core/domain';
import { formatJalali } from '@core/rules/jalali';
import { Badge } from '@ui/Badge';
import { IconAround, IconCalendar, IconMapPin } from '@ui/icons';
import { useI18n } from '../I18nProvider';

export interface DemoActivityCardProps {
  activity: ActivityView;
  categoryName: (id: string) => string;
  categoryIcon: (id: string) => string;
  neighborhoodName: (id: string) => string;
  onOpen: () => void;
}

const TINTS = 6;

/** Stable tint per category, so the same kind of activity always reads the
 *  same colour down the grid. */
function tintIndex(seed: string): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) % 9973;
  return hash % TINTS;
}

/**
 * Scaffolding — U3 replaces this with the real `ActivityCard`.
 *
 * Sized for a four-across grid, so the card carries only what someone scans
 * before deciding to open it: what it is, when, and roughly where. The host is
 * deliberately not shown here — at this width a name and a rating crowd out
 * the three facts that actually drive the decision. Reputation belongs on the
 * detail view, where someone is deciding whether to contact a stranger and
 * has room to weigh it.
 */
export function DemoActivityCard({
  activity,
  categoryName,
  categoryIcon,
  neighborhoodName,
  onOpen,
}: DemoActivityCardProps) {
  const { t } = useI18n();

  const when = formatJalali(new Date(activity.startsAt), 'd MMMM yyyy — HH:mm');
  const isPast = activity.derivedState === 'past';
  const isCancelled = activity.derivedState === 'cancelled';
  const primaryCategory = String(activity.categoryIds[0] ?? '');

  /* INV-2 made visible. The key is absent when the host withheld it, so there
   * is nothing here to accidentally render — this reads the shape of the
   * object, not a flag. */
  const hasExactAddress = 'exactAddress' in activity;

  return (
    <article
      data-testid={`demo-activity-${activity.id}`}
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]',
        'focus-within:ring-2 focus-within:ring-brand',
        'border border-border bg-surface',
        /* Transition TRANSFORM and SHADOW only — never colour.
         * `transition-all` here left the card's background stuck at the
         * previous theme's colour on switch: a transition on a value derived
         * from a custom property changed on :root does not settle. Same defect
         * as the one removed from `body`; the hover lift is what was wanted
         * anyway. */
        'transition-[transform,box-shadow] duration-200',
        'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg',
        isPast ? 'is-past' : '',
      ].join(' ')}
    >
      {/* ---- photo -------------------------------------------------------- */}
      <div
        className={[
          'relative flex aspect-[4/3] items-center justify-center overflow-hidden',
          activity.imageUrl === undefined ? `photo-tint-${tintIndex(primaryCategory)}` : '',
        ].join(' ')}
      >
        {activity.imageUrl === undefined ? (
          <span
            aria-hidden="true"
            className="text-4xl opacity-90 transition-transform duration-300 group-hover:scale-110"
          >
            {categoryIcon(primaryCategory)}
          </span>
        ) : (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute top-2.5 start-2.5 flex gap-1.5">
          {isCancelled ? (
            <Badge variant="count" label={t('date.cancelled')} />
          ) : isPast ? (
            <Badge variant="warning" label={t('date.past')} />
          ) : null}
          {activity.authorKind === 'venue' ? (
            <Badge variant="verified" label={t('venue.verified')} />
          ) : null}
        </div>

        {/* One category, on the image, so the body stays a clean text block.
         * A card at this width cannot carry three chips and still read. */}
        {primaryCategory !== '' && categoryName(primaryCategory) !== '' ? (
          <span className="absolute bottom-2.5 start-2.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-text backdrop-blur">
            {categoryName(primaryCategory)}
          </span>
        ) : null}
      </div>

      {/* ---- body --------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-bold text-text">
          {/* The title is the control, stretched over the whole card by the
           * ::after overlay. One tab stop per card rather than one per link,
           * and the accessible name is the activity title rather than "card". */}
          <button
            type="button"
            onClick={onOpen}
            data-testid={`open-activity-${activity.id}`}
            className="text-start after:absolute after:inset-0 after:content-['']"
          >
            {activity.title}
          </button>
        </h3>

        <dl className="mt-auto flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-text-secondary">
            <dt className="sr-only-text">{t('date.heldOn')}</dt>
            <IconCalendar className="size-4 text-text-muted" />
            <dd className="truncate">{when.ok ? when.value : '—'}</dd>
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <dt className="sr-only-text">{t('location.label')}</dt>
            {hasExactAddress ? (
              <>
                <IconMapPin className="size-4 text-text-muted" />
                <dd className="truncate">{activity.exactAddress}</dd>
              </>
            ) : (
              <>
                {/* A dashed ring instead of a solid pin — the same information
                 * the word carries, drawn. Not a warning icon: withholding an
                 * address is ordinary here, not an exception. */}
                <IconAround className="size-4 text-brand" />
                <dd className="truncate">
                  {t('location.around', {
                    neighborhood: neighborhoodName(String(activity.neighborhoodId)),
                  })}
                </dd>
              </>
            )}
          </div>
        </dl>
      </div>
    </article>
  );
}
