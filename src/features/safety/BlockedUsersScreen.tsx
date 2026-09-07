import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@app/SessionProvider';
import type { UserId } from '@core/domain';
import { t } from '@core/i18n';
import { Avatar } from '@ui/Avatar';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { useSafetyService } from './useSafetyService';

/**
 * US-72 — the blocked list, and the only route to unblocking.
 *
 * ⚠️ THIS LIST SHOWS ONLY PEOPLE THE VIEWER BLOCKED (BR-U6-22). Never people
 * who blocked the viewer — that list would tell someone they had been blocked,
 * defeating BR-U6-12 by a second route. The repository enforces the direction.
 *
 * ⚠️ It is also the one surface where a blocked person must stay VISIBLE, and
 * `safetyRepository.listBlocks` passes a null viewer for exactly that reason:
 * filtering here would empty the list and make unblocking unreachable.
 */
export function BlockedUsersScreen() {
  const { viewerId } = useSession();
  const service = useSafetyService();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blocks', viewerId],
    queryFn: async () => {
      if (viewerId === null) return [];
      const result = await service.listBlocks(viewerId);
      return result.ok ? result.value : [];
    },
    enabled: viewerId !== null,
  });

  async function unblock(id: UserId) {
    if (viewerId === null) return;
    await service.unblockUser(viewerId, id);
    /* Unblocking restores visibility everywhere at once (BR-U6-20), so every
     * cached read is stale — the same reasoning as blocking. */
    await queryClient.invalidateQueries();
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <h1 className="text-xl font-bold text-fg">{t('block.listTitle')}</h1>

      {isLoading ? (
        <Skeleton variant="card" lines={3} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t('block.listEmptyTitle')} message={t('block.listEmptyBody')} />
      ) : (
        <ul className="flex flex-col gap-3" data-testid="blocked-list">
          {(data ?? []).map((person) => (
            <li key={person.id}>
              <Card data-testid={`blocked-${person.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={person.displayName} preset={person.avatarId} size="sm" />
                  <span className="flex-1 font-medium text-fg">{person.displayName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void unblock(person.id)}
                    data-testid={`unblock-${person.id}`}
                  >
                    {t('block.unblock')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
