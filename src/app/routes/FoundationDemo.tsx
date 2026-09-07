import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { normalizePersian, toPersianDigits } from '@core/rules/persianText';
import { EmptyState } from '@ui/EmptyState';
import { ErrorState } from '@ui/ErrorState';
import { Skeleton } from '@ui/Skeleton';
import { FilterPanel } from './FilterPanel';
import { useI18n } from '../I18nProvider';
import { useRepositories } from '../RepositoryProvider';
import { useSession } from '../SessionProvider';
import { useFeedFilters } from '../FeedFilterProvider';
import { DemoActivityCard } from './DemoActivityCard';
import { ActivityDetailModal } from './ActivityDetailModal';

const TINTS = 6;

/** Same tint mapping the card uses, so an activity keeps its colour when the
 *  detail view opens over it. */
function tintClass(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) % 9973;
  return `photo-tint-${hash % TINTS}`;
}

/**
 * U1's definition-of-done screen.
 *
 * Not a product screen — U3 replaces it. It exists to make the foundation
 * demonstrable in a browser in Persian (Units Gen Q8 `A`), which is what
 * surfaces RTL and layout problems as they are introduced rather than at the
 * end of the project.
 *
 * Search and categories now live in the top bar; this route owns the date
 * filter and the grid.
 */
export function FoundationDemo() {
  const { t } = useI18n();
  const { viewerId } = useSession();
  const repositories = useRepositories();
  /* The filter CONTROLS moved to FilterPanel (CR-02 item 6); this screen still
   * consumes the composed result. */
  const { query, filters, clear } = useFeedFilters();

  const [openActivityId, setOpenActivityId] = useState<string | null>(null);

  const feed = useQuery({
    queryKey: ['feed', viewerId, filters],
    queryFn: () =>
      repositories.activities.listFeed({
        viewerId,
        mode: 'combined',
        limit: 24,
        ...(filters === undefined ? {} : { filters }),
      }),
    /* Keep the previous results on screen while the next ones load.
     *
     * Without this the query key changes on every keystroke and when the
     * session resolves, so the grid empties to skeletons and refills — the
     * list flickers under the user's hands while they type, and the page
     * height jumps. Holding the old data means only the content changes. */
    placeholderData: (previous) => previous,
  });

  /* Names come from reference data, never from the id. Rendering the slug
   * would put «boardgames» on screen in a Persian-only product — US-90 says no
   * untranslated English is visible to users. */
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => repositories.reference.listCategories(),
  });

  const { data: neighborhoods } = useQuery({
    queryKey: ['neighborhoods'],
    queryFn: () => repositories.reference.listNeighborhoods(),
  });

  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.nameFa ?? '';
  const categoryIcon = (id: string) => categories?.find((c) => c.id === id)?.icon ?? '•';
  const neighborhoodName = (id: string) => neighborhoods?.find((n) => n.id === id)?.nameFa ?? '';

  return (
    /* CR-02 item 6 — filters on the inline-START side, which in RTL is the
     * right. `flex-row` with the panel FIRST in DOM order puts it there
     * without a single physical `right:` anywhere: the writing direction does
     * the work, so nothing breaks if a surface ever renders LTR. */
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <FilterPanel />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-text">{t('demo.title')}</h2>
          <p className="text-text-secondary">{t('demo.subtitle')}</p>
        </header>

        {query.trim() !== '' ? (
          <p className="text-xs text-text-muted" data-testid="demo-normalized-query">
            {normalizePersian(query)}
          </p>
        ) : null}

        {/* ---- results ------------------------------------------------------ */}
        {feed.isPending ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="demo-loading"
          >
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : feed.isError ? (
          <ErrorState
            title={t('state.error.title')}
            message={t('state.error.message')}
            retryLabel={t('action.retry')}
            onRetry={() => void feed.refetch()}
          />
        ) : feed.data.items.length === 0 ? (
          <EmptyState
            title={t('state.empty.search.title')}
            message={t('state.empty.search.message')}
            action={{ label: t('state.empty.search.action'), onClick: clear }}
            illustration="🔍"
          />
        ) : (
          <section className="flex flex-col gap-4">
            <p className="text-sm text-text-muted" data-testid="demo-activity-count">
              {t('demo.activityCount', { count: toPersianDigits(feed.data.items.length) })}
            </p>

            <div
              data-testid="demo-grid"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {feed.data.items.map((activity) => (
                <DemoActivityCard
                  key={activity.id}
                  activity={activity}
                  categoryName={categoryName}
                  categoryIcon={categoryIcon}
                  neighborhoodName={neighborhoodName}
                  onOpen={() => setOpenActivityId(String(activity.id))}
                />
              ))}
            </div>
          </section>
        )}

        <ActivityDetailModal
          activity={feed.data?.items.find((a) => String(a.id) === openActivityId) ?? null}
          onClose={() => setOpenActivityId(null)}
          categoryName={categoryName}
          categoryIcon={categoryIcon}
          neighborhoodName={neighborhoodName}
          tintClass={tintClass}
        />
      </div>
    </div>
  );
}
