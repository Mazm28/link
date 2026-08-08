import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '@app/SessionProvider';
import type { RequestId } from '@core/domain';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { Badge } from '@ui/Badge';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Dialog } from '@ui/Dialog';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { useConnectionService } from './useConnectionServices';

/**
 * US-33 — my sent requests, and withdrawal.
 *
 * ⚠️ `SentRequestView` HAS NO FIELD FOR THE POSTER'S CONTACT DETAILS, so
 * FR-35's one-way asymmetry holds BY TYPE rather than by care (BR-U4-80). The
 * `sharedContact` shown here is the requester's OWN detail, displayed back so
 * they can see what they disclosed.
 *
 * A test written during CR-05 asserted the field's absence, failed, and was
 * itself wrong — the field is deliberate and US-30 needs it. Recorded so it is
 * not "fixed" again.
 */
export function SentRequestsScreen() {
  const { viewerId } = useSession();
  const service = useConnectionService();
  const queryClient = useQueryClient();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<RequestId | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'sent', viewerId],
    queryFn: async () => {
      if (viewerId === null) return [];
      const result = await service.listSentRequests(viewerId);
      return result.ok ? result.value : [];
    },
    enabled: viewerId !== null,
  });

  async function withdraw() {
    if (viewerId === null || pendingWithdrawal === null) return;
    await service.withdrawRequest(viewerId, pendingWithdrawal);
    setPendingWithdrawal(null);
    await queryClient.invalidateQueries({ queryKey: ['requests'] });
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <h1 className="text-xl font-bold text-fg">{t('sent.title')}</h1>

      <nav className="flex gap-2" aria-label={t('sent.title')}>
        <Link
          to="/requests"
          className="rounded-full px-3 py-1 text-sm text-text-secondary hover:text-text"
          data-testid="requests-tab-incoming"
        >
          {t('sent.tabIncoming')}
        </Link>
        <span className="rounded-full bg-brand-subtle px-3 py-1 text-sm text-brand">
          {t('sent.tabSent')}
        </span>
      </nav>

      {isLoading ? (
        <Skeleton variant="card" lines={4} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t('sent.emptyTitle')} message={t('sent.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-3" data-testid="sent-list">
          {(data ?? []).map((request) => {
            const when = formatJalali(new Date(request.activity.startsAt), 'd MMMM yyyy');

            return (
              <li key={request.id}>
                <Card data-testid={`sent-${request.id}`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/activity/${request.activity.id}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {request.activity.title}
                      </Link>
                      <Badge
                        variant={request.status === 'withdrawn' ? 'warning' : 'default'}
                        label={
                          request.status === 'withdrawn'
                            ? t('sent.stateWithdrawn')
                            : t('sent.stateSent')
                        }
                      />
                    </div>

                    <span className="text-xs text-fg-muted">{when.ok ? when.value : ''}</span>

                    {/* The requester's OWN detail, shown back to them. */}
                    <p className="text-sm text-fg-muted">
                      {t('sent.shared')}{' '}
                      <span dir="ltr" className="text-fg">
                        {request.sharedContact.kind === 'none'
                          ? t('requests.sharedNone')
                          : request.sharedContact.value}
                      </span>
                    </p>

                    {request.status === 'sent' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingWithdrawal(request.id)}
                        data-testid={`withdraw-${request.id}`}
                      >
                        {t('sent.withdraw')}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* ⚠️ BR-U4-42 — THE HONEST CONFIRMATION.
          Withdrawal revokes a flag. It does not undo the disclosure, and the
          poster may already have written the number down. US-33's notes are
          explicit that a UI implying recall would be FALSE, and worse than not
          offering withdrawal at all. This dialog exists to say so. */}
      <Dialog
        open={pendingWithdrawal !== null}
        onClose={() => setPendingWithdrawal(null)}
        onConfirm={() => void withdraw()}
        title={t('sent.withdraw')}
        message={t('sent.withdrawWarning')}
        confirmLabel={t('sent.withdrawConfirm')}
        cancelLabel={t('join.cancel')}
        data-testid="withdraw-dialog"
      />
    </section>
  );
}
