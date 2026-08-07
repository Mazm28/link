import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useSession } from '@app/SessionProvider';
import type { ActivityId } from '@core/domain';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { toPersianDigits } from '@core/rules/persianText';
import { locationLabel } from './locationLabel';
import { Avatar } from '@ui/Avatar';
import { Badge } from '@ui/Badge';
import { Card } from '@ui/Card';
import { ErrorState } from '@ui/ErrorState';
import { RatingStars } from '@ui/RatingStars';
import { Skeleton } from '@ui/Skeleton';
import { ActivityMap } from './ActivityMap';
import { useActivityService } from './useActivityServices';

/**
 * ActivityDetailScreen — US-25.
 *
 * Renders from `ActivityView`, so INV-2 and INV-5 hold here for the same
 * structural reason they hold on the card: the withheld fields are not in
 * scope. The map below shows a pin or a circle depending on which of them the
 * view actually carries — the component never decides.
 */
export function ActivityDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { viewerId } = useSession();
  const service = useActivityService();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => service.getActivity(viewerId, id as ActivityId),
    enabled: id !== undefined,
  });

  if (isLoading) return <Skeleton variant="card" lines={5} />;
  if (isError || data === undefined || data === null) {
    return <ErrorState title={t('state.error.title')} message={t('state.error.message')} />;
  }

  const when = formatJalali(new Date(data.startsAt), 'd MMMM yyyy — HH:mm');
  const place = locationLabel(data);

  const mapCenter =
    data.coordinate ?? data.approximateArea?.center ?? { lat: 35.6997, lng: 51.4015 };

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-3 py-3">
      <div className="flex flex-wrap gap-2">
        {data.derivedState === 'cancelled' && (
          <Badge variant="warning" label={t('activity.stateCancelled')} />
        )}
        {data.derivedState === 'past' && (
          <Badge variant="default" label={t('activity.statePast')} />
        )}
        {data.authorKind === 'venue' && <Badge variant="verified" label={t('venue.verified')} />}
      </div>

      <h1 className="text-2xl font-bold text-fg">{data.title}</h1>

      <dl className="grid gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-fg-muted">{t('date.heldOn')}</dt>
          <dd className="text-fg">{when.ok ? when.value : ''}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-fg-muted">{t('location.label')}</dt>
          <dd className="text-fg">{place}</dd>
        </div>
        {data.capacity !== undefined && (
          <div className="flex gap-2">
            <dt className="text-fg-muted">{t('demo.capacity')}</dt>
            <dd className="text-fg">
              {t('demo.capacityValue', { count: toPersianDigits(data.capacity) })}
            </dd>
          </div>
        )}
      </dl>

      <p className="whitespace-pre-line text-sm leading-7 text-fg">{data.description}</p>

      <ActivityMap activities={[data]} center={mapCenter} height={180} />

      {/* The host, with their rating. Deliberately present: this is the moment
          someone decides whether to contact a stranger, and reputation is most
          of what they have to go on. */}
      <Card>
        {/* Labelled. A name and a row of stars with nothing saying who the
            person is leaves the reader to infer it from position. */}
        <h2 className="mb-2 text-sm font-medium text-fg-muted">{t('detail.aboutHost')}</h2>
        <div className="flex items-center gap-3">
          <Avatar name={data.author.displayName} preset={data.author.avatarId} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-fg">{data.author.displayName}</span>
            {/* `null` passes through as null, not as zero. US-53: five empty
                stars read as "rated badly", and for someone deciding whether
                to meet a stranger that misreading has consequences. */}
            <RatingStars
              value={data.author.rating.average}
              count={data.author.rating.count}
              emptyLabel={t('rating.none')}
            />
          </div>
        </div>
      </Card>
    </article>
  );
}
