import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRepositories } from '@app/RepositoryProvider';
import { useSession } from '@app/SessionProvider';
import type { JoinRequestView } from '@core/domain';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { Avatar } from '@ui/Avatar';
import { Badge } from '@ui/Badge';
import { Card } from '@ui/Card';
import { EmptyState } from '@ui/EmptyState';
import { ErrorState } from '@ui/ErrorState';
import { Skeleton } from '@ui/Skeleton';
import { SafetyMenu } from '@features/safety';
import { RatingSummaryBadge } from './RatingSummaryBadge';
import { useConnectionService } from './useConnectionServices';

/**
 * US-40 / US-41 — the poster's inbox.
 *
 * ⚠️ REBUILT FROM SCRATCH IN U4. CR-05 shipped a mock of this screen ahead of
 * its unit; the user's instruction at the U3 gate was that it be rebuilt, not
 * inherited, and answer Q1 `C` discarded both the mock and its test file. What
 * carried forward is the INV-3 assertions, rewritten in U4's own suite.
 *
 * What the mock did not do, and US-40 requires:
 *   • grouping by ACTIVITY, most recent first  (BR-U4-105)
 *   • the requester's RATING summary — omitted entirely by the mock, on the
 *     screen where someone decides whether to meet a stranger (US-53)
 *
 * ⚠️ THIS SCREEN CARRIES THE PRODUCT'S ONE INV-3 EXCEPTION.
 *
 * `sharedContact` is the single place another person's contact detail is
 * legitimately disclosed, and it is scoped twice: only on a request, and only
 * to the poster of the activity that request targets. The scoping is
 * `listIncomingRequests(posterId)`'s job — this component renders what it is
 * given and fetches by no other route (BR-U4-91).
 */
export function RequestsInboxScreen() {
  const { viewerId } = useSession();
  const repositories = useRepositories();
  const service = useConnectionService();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['requests', 'incoming', viewerId],
    queryFn: async () => {
      if (viewerId === null) return [];
      const result = await service.listIncomingRequests(viewerId);
      return result.ok ? result.value : [];
    },
    enabled: viewerId !== null,
  });

  /* Activity titles, for the group headings. Fetched separately rather than
   * widened into JoinRequestView: the view carries an activityId because that
   * is all the INV-3 scope needs, and widening a view to save a fetch is how
   * fields nobody scoped end up travelling. */
  const { data: activities } = useQuery({
    queryKey: ['activities', 'mine', viewerId],
    queryFn: async () => {
      if (viewerId === null) return [];
      return repositories.activities.listByAuthor(viewerId, viewerId);
    },
    enabled: viewerId !== null,
  });

  const titleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of activities ?? []) map.set(String(a.id), a.title);
    return map;
  }, [activities]);

  /* BR-U4-105 — grouped by activity, most recent request first within each,
   * and the groups themselves ordered by their most recent request. */
  const groups = useMemo(() => {
    const byActivity = new Map<string, JoinRequestView[]>();
    for (const request of data ?? []) {
      const key = String(request.activityId);
      byActivity.set(key, [...(byActivity.get(key) ?? []), request]);
    }
    return [...byActivity.entries()]
      .map(([activityId, requests]) => ({
        activityId,
        requests: [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }))
      .sort((x, y) => (y.requests[0]?.createdAt ?? '').localeCompare(x.requests[0]?.createdAt ?? ''));
  }, [data]);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg">{t('requests.title')}</h1>
        <p className="text-sm text-fg-muted">{t('requests.subtitle')}</p>
      </header>

      <nav className="flex gap-2" aria-label={t('requests.title')}>
        <span className="rounded-full bg-brand-subtle px-3 py-1 text-sm text-brand">
          {t('sent.tabIncoming')}
        </span>
        <Link
          to="/requests/sent"
          className="rounded-full px-3 py-1 text-sm text-text-secondary hover:text-text"
          data-testid="requests-tab-sent"
        >
          {t('sent.tabSent')}
        </Link>
      </nav>

      {isLoading ? (
        <Skeleton variant="card" lines={4} />
      ) : isError ? (
        <ErrorState
          title={t('state.error.title')}
          message={t('state.error.message')}
          onRetry={() => void refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState title={t('requests.emptyTitle')} message={t('requests.emptyBody')} />
      ) : (
        <div className="flex flex-col gap-6" data-testid="requests-list">
          {groups.map((group) => (
            <div key={group.activityId} className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-fg">
                <Link to={`/activity/${group.activityId}`} className="hover:underline">
                  {titleOf.get(group.activityId) ?? t('requests.forActivity')}
                </Link>{' '}
                <span className="text-sm font-normal text-fg-muted">
                  ({group.requests.length})
                </span>
              </h2>

              <ul className="flex flex-col gap-3">
                {group.requests.map((request) => {
                  const when = formatJalali(new Date(request.createdAt), 'd MMMM yyyy');

                  return (
                    <li key={request.id}>
                      <Card data-testid={`request-${request.id}`}>
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={request.requester.displayName}
                            preset={request.requester.avatarId}
                          />

                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-fg">
                                {request.requester.displayName}
                              </span>
                              {/* US-40/US-53 — the mock omitted this. It is
                                  the screen where someone decides whether to
                                  meet a stranger. */}
                              <RatingSummaryBadge summary={request.requester.rating} />
                              {request.status === 'withdrawn' && (
                                <Badge variant="warning" label={t('sent.stateWithdrawn')} />
                              )}
                              {/* U6 — the requester is a stranger who now has
                                  your activity and you have their contact
                                  detail. This is exactly where report and
                                  block need to be. */}
                              <SafetyMenu
                                subject={{
                                  kind: 'user',
                                  userId: request.requester.id,
                                  name: request.requester.displayName,
                                  relatedActivityId: request.activityId,
                                }}
                              />
                            </div>

                            <span className="text-xs text-fg-muted">
                              {when.ok ? when.value : ''}
                            </span>

                            {request.note !== undefined && (
                              <p className="mt-1 text-sm text-fg">{request.note}</p>
                            )}

                            {/* ⚠️ THE INV-3 EXCEPTION. Revoked renders AS
                                revoked rather than disappearing (BR-U4-43):
                                the poster may already have written it down,
                                and erasing it would be a worse account of what
                                happened than saying it is no longer valid. */}
                            <p
                              className="mt-1 text-sm"
                              data-testid={`request-contact-${request.id}`}
                            >
                              {request.contactRevoked ? (
                                <span className="text-fg-muted">{t('requests.revoked')}</span>
                              ) : request.sharedContact.kind === 'none' ? (
                                /* ⚠️ LEGACY ONLY — CR-07 made sharing
                                   mandatory, so no NEW request reaches this
                                   branch. The five seeded rows that predate it
                                   still do, and this copy is the only thing
                                   that renders them honestly. */
                                <span className="text-fg-muted">{t('requests.sharedNone')}</span>
                              ) : (
                                <span className="text-fg" dir="ltr">
                                  {request.sharedContact.kind === 'phone'
                                    ? `${t('requests.sharedPhone')}: ${request.sharedContact.value}`
                                    : `${t('requests.sharedTelegram')}: ${request.sharedContact.value}`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ⚠️ FR-35 / BR-U4-82 — said out loud. The exchange is one-way by
          design, and a poster who assumes otherwise may share less carefully
          than one who knows the next move is theirs. */}
      <p className="text-xs text-fg-muted">{t('requests.oneWay')}</p>
    </section>
  );
}
