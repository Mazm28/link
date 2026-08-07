import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRepositories } from '@app/RepositoryProvider';
import { useSession } from '@app/SessionProvider';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { Avatar } from '@ui/Avatar';
import { Badge } from '@ui/Badge';
import { Card } from '@ui/Card';
import { EmptyState } from '@ui/EmptyState';
import { ErrorState } from '@ui/ErrorState';
import { Skeleton } from '@ui/Skeleton';

/**
 * RequestsInboxScreen — US-40.
 *
 * People who asked to join MY activities. Until now `/requests` rendered the
 * old foundation demo, so the nav item promised one thing and showed another.
 *
 * ⚠️ THIS SCREEN CARRIES THE ONE INV-3 EXCEPTION.
 *
 * `sharedContact` is the single place another person's contact detail is
 * legitimately disclosed, and it is scoped twice over: only on a request, and
 * only to the poster of the activity that request targets. The scoping is
 * `listIncomingRequests(posterId)`'s job — this component renders what it is
 * given and never fetches by any other route.
 *
 * FR-35 asymmetry, stated on screen: the requester received nothing back.
 *
 * The full loop — sending a request, the mandatory disclosure sheet,
 * withdrawal, attendance, ratings — is U4. This is the read surface, which the
 * repository has supported since U1.
 */
export function RequestsInboxScreen() {
  const { viewerId } = useSession();
  const repositories = useRepositories();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['requests', 'incoming', viewerId],
    queryFn: () =>
      viewerId === null ? [] : repositories.connections.listIncomingRequests(viewerId),
    enabled: viewerId !== null,
  });

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg">{t('requests.title')}</h1>
        <p className="text-sm text-fg-muted">{t('requests.subtitle')}</p>
      </header>

      {isLoading ? (
        <Skeleton variant="card" lines={4} data-testid="requests-loading" />
      ) : isError || data === undefined ? (
        <ErrorState
          title={t('state.error.title')}
          message={t('state.error.message')}
          onRetry={() => void refetch()}
        />
      ) : data.length === 0 ? (
        <EmptyState title={t('requests.emptyTitle')} message={t('requests.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-3" data-testid="requests-list">
          {data.map((request) => {
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
                        {request.status === 'withdrawn' && (
                          <Badge variant="warning" label={t('requests.withdrawn')} />
                        )}
                      </div>

                      <span className="text-xs text-fg-muted">{when.ok ? when.value : ''}</span>

                      <Link
                        to={`/activity/${request.activityId}`}
                        className="text-sm text-brand underline"
                      >
                        {t('requests.forActivity')}
                      </Link>

                      {request.note !== undefined && (
                        <p className="mt-1 text-sm text-fg">{request.note}</p>
                      )}

                      {/* The disclosure. A revoked detail is shown as revoked
                          rather than removed: the poster may already have
                          written it down, and pretending otherwise would be a
                          worse account of what happened (US-33). */}
                      <p className="mt-1 text-sm" data-testid={`request-contact-${request.id}`}>
                        {request.contactRevoked ? (
                          <span className="text-fg-muted">{t('requests.revoked')}</span>
                        ) : request.sharedContact.kind === 'none' ? (
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
      )}

      {/* FR-35 — said out loud. The exchange is one-way by design, and a
          poster who assumes otherwise may share less carefully than they
          would if they knew. */}
      <p className="text-xs text-fg-muted">{t('requests.oneWay')}</p>
    </section>
  );
}
