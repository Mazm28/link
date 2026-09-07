import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@app/SessionProvider';
import type { Notification } from '@core/domain';
import { t } from '@core/i18n';
import { formatJalali } from '@core/rules/jalali';
import { Card } from '@ui/Card';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { useNotificationService } from '@features/connections/useConnectionServices';

/**
 * FR-70 / US-40 — the in-app notification list.
 *
 * ⚠️ NO PUSH, NO EMAIL, AND `Notification.requestPermission()` IS NEVER
 * CALLED (FR-72, BR-U4-103). No permission prompt is ever shown to anyone.
 * The `Notification` type imported here is the DOMAIN entity; it collides by
 * name with the browser API and is unrelated to it.
 *
 * ⚠️ The nav badge does NOT count what this screen lists. The badge counts
 * unread REQUESTS only (BR-U4-102) — US-40 calls it the entire retention
 * mechanism for the poster persona, and a number that sometimes means
 * "requests" and sometimes "anything" is one nobody can act on.
 */
export function NotificationsScreen() {
  const { viewerId } = useSession();
  const service = useNotificationService();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', viewerId],
    queryFn: async () => {
      if (viewerId === null) return [];
      const result = await service.list(viewerId);
      return result.ok ? result.value : [];
    },
    enabled: viewerId !== null,
  });

  /* Opening the screen marks what is on it as read. Done in an effect rather
   * than during render so the write is not repeated by a re-render, and keyed
   * on the ids so a later arrival is not silently swallowed. */
  const unreadIds = (data ?? []).filter((n) => n.readAt === undefined).map((n) => String(n.id));
  const unreadKey = unreadIds.join(',');

  useEffect(() => {
    if (viewerId === null || unreadKey === '') return;
    void (async () => {
      await service.markRead(viewerId, unreadKey.split(','));
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    })();
  }, [viewerId, unreadKey, service, queryClient]);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <h1 className="text-xl font-bold text-fg">{t('notifications.title')}</h1>

      {isLoading ? (
        <Skeleton variant="card" lines={4} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t('notifications.emptyTitle')} message={t('notifications.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-2" data-testid="notifications-list">
          {(data ?? []).map((notification) => {
            const when = formatJalali(new Date(notification.createdAt), 'd MMMM yyyy');

            return (
              <li key={notification.id}>
                <Card data-testid={`notification-${notification.id}`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-fg">{describe(notification.kind)}</span>
                    <span className="text-xs text-fg-muted">{when.ok ? when.value : ''}</span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * ⚠️ Rendered from the KIND alone, never from the payload.
 *
 * Payloads carry ids and nothing else (NFR-S1, BR-U4-92). A notification must
 * never hold a contact detail — consumers resolve ids through the repository,
 * where INV-3's scoping applies. Building a message out of payload values is
 * exactly how that scoping gets routed around.
 */
function describe(kind: Notification['kind']): string {
  switch (kind) {
    case 'request_received':
      return t('notifications.requestReceived');
    case 'request_withdrawn':
      return t('notifications.requestWithdrawn');
    case 'activity_cancelled':
      return t('notifications.activityCancelled');
    case 'attendance_due':
      return t('notifications.attendanceDue');
    case 'rating_received':
      return t('notifications.ratingReceived');
  }
}
