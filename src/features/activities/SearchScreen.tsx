import { useQuery } from '@tanstack/react-query';
import { useCity } from '@app/CityProvider';
import { useSession } from '@app/SessionProvider';
import { useFeedFilters } from '@app/FeedFilterProvider';
import { t } from '@core/i18n';
import { matchTier } from '@core/rules/filters';
import { normalizePersian, toPersianDigits } from '@core/rules/persianText';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { ActivityCard } from './ActivityCard';
import { useActivityService } from './useActivityServices';

/**
 * SearchScreen — US-23.
 *
 * Search results obey INV-2 and INV-5 exactly as the feed does. That is worth
 * stating because search is the one path where the text MATCHED against and
 * the text RETURNED differ: a query can match a description the viewer only
 * partially receives. The projection is the same one, so the guarantee is the
 * same — P-U3-05 checks it rather than assuming it.
 */
export function SearchScreen() {
  const { user, viewerId } = useSession();
  const { cityId } = useCity();
  const { query, filters } = useFeedFilters();
  const service = useActivityService();

  const { data, isLoading } = useQuery({
    queryKey: ['search', cityId, query, filters, viewerId],
    queryFn: () =>
      service.getFeed({
        viewer: user,
        ...(cityId === null ? {} : { cityId }),
        mode: 'combined',
        ...(filters === undefined ? {} : { filters }),
        limit: 50,
      }),
  });

  if (isLoading) return <Skeleton variant="card" lines={4} />;

  const items = data?.ok === true ? data.value.page.items : [];
  /* BR-U3-73 — title matches first, then description matches. Ranking still
   * orders within each tier, so results stay ranked rather than becoming
   * alphabetical by accident. */
  const ordered =
    query.trim() === ''
      ? items
      : [...items].sort((a, b) => matchTier(a, query) - matchTier(b, query));

  return (
    <section className="flex flex-col gap-4">
      {query.trim() !== '' && (
        <p className="text-xs text-fg-muted" data-testid="search-normalized">
          {normalizePersian(query)}
        </p>
      )}

      <p className="text-sm text-fg-muted" data-testid="search-count">
        {t('feed.count', { count: toPersianDigits(ordered.length) })}
      </p>

      {ordered.length === 0 ? (
        <EmptyState title={t('feed.emptyTitle')} message={t('feed.emptyBody')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </section>
  );
}
