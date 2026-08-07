import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '@app/SessionProvider';
import type { ActivityView } from '@core/domain';
import { t } from '@core/i18n';
import { toPersianDigits } from '@core/rules/persianText';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { ActivityCard } from './ActivityCard';
import { useActivityService } from './useActivityServices';

/**
 * MyActivitiesScreen — US-13.
 *
 * One of the two places a PAST activity is still visible after BR-U3-40 took
 * them out of discovery. The other is the author's public profile. U4's rating
 * flow depends on both routes surviving, since a rating can only come from an
 * activity that already happened.
 */
export function MyActivitiesScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, viewerId } = useSession();
  const service = useActivityService();

  const { data = [], isLoading } = useQuery({
    queryKey: ['activities', viewerId],
    queryFn: () => (viewerId === null ? [] : service.listByAuthor(viewerId, viewerId)),
    enabled: viewerId !== null,
  });

  if (isLoading) return <Skeleton variant="card" lines={4} />;
  if (user === null) return null;

  const groups: { key: 'my.upcoming' | 'my.past' | 'my.cancelled'; items: ActivityView[] }[] = [
    { key: 'my.upcoming', items: data.filter((a) => a.derivedState === 'upcoming') },
    { key: 'my.past', items: data.filter((a) => a.derivedState === 'past') },
    { key: 'my.cancelled', items: data.filter((a) => a.derivedState === 'cancelled') },
  ];

  if (data.length === 0) {
    return <EmptyState title={t('my.emptyTitle')} message={t('my.emptyBody')} />;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* The profile hub supplies its own heading, so an embedded copy would
          give the page two. */}
      {!embedded && <h1 className="text-xl font-semibold text-fg">{t('my.title')}</h1>}

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.key} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-fg-muted">
              {t(group.key)} ({toPersianDigits(group.items.length)})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((a) => (
                <div key={a.id} className="flex flex-col gap-1">
                  <ActivityCard activity={a} />
                  {/* BR-U3-31/32 — an UPCOMING activity is fully editable. A
                    * past one takes description edits only and a cancelled one
                    * none, so offering the link there would promise something
                    * the service refuses. */}
                  {a.derivedState === 'upcoming' && (
                    <Link
                      to={`/activity/${a.id}/edit`}
                      className="self-start text-sm text-brand underline"
                      data-testid={`edit-activity-${a.id}`}
                    >
                      {t('my.edit')}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </section>
  );
}
