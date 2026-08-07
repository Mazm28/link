import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '@app/CityProvider';
import { useSession } from '@app/SessionProvider';
import { useFeedFilters } from '@app/FeedFilterProvider';
import { t } from '@core/i18n';
import { toPersianDigits } from '@core/rules/persianText';
import type { FeedMode } from '@core/rules/ranking';
import { CITY_BY_ID } from '@core/reference/cities';
import { Button } from '@ui/Button';
import { EmptyState } from '@ui/EmptyState';
import { ErrorState } from '@ui/ErrorState';
import { Skeleton } from '@ui/Skeleton';
import { FilterPanel } from '@app/routes/FilterPanel';
import { ActivityCard } from './ActivityCard';
import { ActivityMap } from './ActivityMap';
import { useActivityService } from './useActivityServices';

const MODES: { id: FeedMode; key: 'feed.modeCombined' | 'feed.modeNeighborhood' | 'feed.modeInterest' }[] = [
  { id: 'combined', key: 'feed.modeCombined' },
  { id: 'neighborhood', key: 'feed.modeNeighborhood' },
  { id: 'interest', key: 'feed.modeInterest' },
];

/**
 * FeedScreen — US-20, US-21, US-22.
 *
 * The three modes are TABS, not filters. A mode changes what "relevant" means;
 * a filter narrows a set. Putting the mode switch in the filter panel would
 * bury a primary navigation choice among narrowing controls, and hide two of
 * three modes behind a tap on a phone.
 */
export function FeedScreen() {
  const { user } = useSession();
  const { cityId, cityName } = useCity();
  const { filters } = useFeedFilters();
  const service = useActivityService();

  const [mode, setMode] = useState<FeedMode>('combined');
  const [view, setView] = useState<'list' | 'map'>('list');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['feed', cityId, mode, filters, user?.id ?? null],
    queryFn: () =>
      service.getFeed({
        viewer: user,
        cityId,
        mode,
        ...(filters === undefined ? {} : { filters }),
        limit: 50,
      }),
  });

  const failed = isError || (data !== undefined && !data.ok);
  const result = data !== undefined && data.ok ? data.value : null;
  const page = result?.page ?? null;
  const appliedMode = result?.appliedMode ?? mode;
  const requestedModeAvailable = result?.requestedModeAvailable ?? true;

  return (
    /* CR-02 item 6 — the filter rail sits on the inline-START side, which in
     * RTL is the right. The panel was attached to `FoundationDemo`; U3 retires
     * that screen (step 37), so the real feed takes it over rather than
     * leaving the controls orphaned. */
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <FilterPanel />

      <section className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="tablist" aria-label={t('feed.modeCombined')}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={[
                'touch-target rounded-full px-3 py-1.5 text-sm',
                mode === m.id ? 'bg-brand text-on-brand' : 'text-fg-muted hover:bg-surface-sunken',
              ].join(' ')}
              data-testid={`feed-mode-${m.id}`}
            >
              {t(m.key)}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(view === 'list' ? 'map' : 'list')}
          data-testid="feed-view-toggle"
        >
          {view === 'list' ? t('feed.viewMap') : t('feed.viewList')}
        </Button>
      </div>

      {/* BR-U3-64/65 — the fallback is VISIBLE. A feed that quietly changes
          what it ranks by is a feed nobody can reason about, and after CR-02
          made interests and location optional this is the common path rather
          than an edge case. */}
      {!requestedModeAvailable && appliedMode !== mode && (
        <p
          className="rounded-[var(--radius-card)] bg-surface-sunken px-3 py-2 text-sm text-fg-muted"
          data-testid="feed-fallback-notice"
        >
          {mode === 'neighborhood' ? t('feed.fallbackNeighborhood') : t('feed.fallbackInterest')}
        </p>
      )}

      {page !== null && (
        <p className="text-sm text-fg-muted" data-testid="feed-count">
          {t('feed.count', { count: toPersianDigits(page.items.length) })}
        </p>
      )}

      {isLoading ? (
        <Skeleton variant="card" lines={4} data-testid="feed-loading" />
      ) : failed || page === null ? (
        <ErrorState
          title={t('state.error.title')}
          message={t('state.error.message')}
          onRetry={() => void refetch()}
        />
      ) : page.items.length === 0 ? (
        <EmptyState
          title={t('feed.emptyTitle')}
          message={t('feed.emptyCity', { city: cityName })}
        />
      ) : view === 'map' ? (
        <ActivityMap
          activities={page.items}
          center={CITY_BY_ID.get(cityId)?.center ?? { lat: 35.6997, lng: 51.4015 }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="feed-grid">
          {page.items.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
      </section>
    </div>
  );
}
