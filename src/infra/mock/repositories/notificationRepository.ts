import { NotificationIdCodec, type Notification, type UserId } from '@core/domain';
import type { CreateNotificationInput, NotificationRepository } from '@core/repositories';
import { isHiddenFrom } from '@core/rules/visibility';
import type { MockContext } from './context';

export function createNotificationRepository(ctx: MockContext): NotificationRepository {
  /**
   * U6 / BR-U6-30 — is this notification about someone the viewer has blocked?
   *
   * ⚠️ Payloads carry IDS ONLY (NFR-S1, BR-U4-92), so the originating person is
   * resolved through the store rather than read off the notification. That is
   * the point of the ids-only rule, and this is the first consumer to depend
   * on it.
   *
   * ⚠️ `rating_received` IS DELIBERATELY NOT FILTERED, and that is not an
   * oversight. Its payload carries only an activity id, and ratings are NEVER
   * ATTRIBUTED to their author anywhere in the product (BR-U4-71, US-53) — so
   * "you received a rating" discloses nothing whatsoever about who wrote it.
   * There is no blocked person to hide, because the notification never names
   * one. Filtering it would require storing the rater's id in the payload,
   * which would put an attribution into the system purely to hide it again.
   */
  const isFromHidden = (n: Notification, viewerId: UserId): boolean => {
    const blocks = ctx.blockIndexFor();
    const state = ctx.store.read();

    const requestId = n.payload['requestId'];
    if (requestId !== undefined) {
      const request = state.joinRequests.find((r) => String(r.id) === requestId);
      if (request) return isHiddenFrom(viewerId, request.requesterId, blocks);
    }

    const activityId = n.payload['activityId'];
    if (activityId !== undefined && n.kind === 'activity_cancelled') {
      const activity = state.activities.find((a) => String(a.id) === activityId);
      if (activity) return isHiddenFrom(viewerId, activity.authorId, blocks);
    }

    return false;
  };

  return {
    async list(userId: UserId): Promise<Notification[]> {
      await ctx.delay();
      return (
        ctx.store
          .read()
          .notifications.filter((n) => n.userId === userId)
          /* U6 / BR-U6-30 — filtered before the sort and before return. */
          .filter((n) => !isFromHidden(n, userId))
          .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      );
    },

    /** Drives the nav badge, which per personas.md is the product's only
     *  retention mechanism — there are no push notifications and no email. */
    async getUnreadCount(userId: UserId): Promise<number> {
      await ctx.delay();
      return ctx.store
        .read()
        .notifications.filter(
          (n) => n.userId === userId && n.readAt === undefined && !isFromHidden(n, userId),
        ).length;
    },

    async markRead(userId: UserId, ids: string[]): Promise<void> {
      await ctx.delay();
      const wanted = new Set(ids);
      ctx.store.mutate((s) => {
        for (const n of s.notifications) {
          if (n.userId === userId && wanted.has(n.id)) n.readAt = new Date().toISOString();
        }
      });
    },

    /**
     * FR-72 — `channel` is set here, always to 'in_app'.
     *
     * The field exists on the entity so that adding push later is a new enum
     * member and a delivery adapter rather than a migration of every
     * notification row. It is set by the repository rather than accepted from
     * the caller so Round 1 cannot create a notification on a channel that has
     * no delivery mechanism behind it.
     */
    async create(input: CreateNotificationInput): Promise<Notification> {
      await ctx.delay();
      const notification: Notification = {
        id: NotificationIdCodec.create(),
        userId: input.userId,
        kind: input.kind,
        channel: 'in_app',
        // IDs only — never contact details (NFR-S1).
        payload: input.payload,
        createdAt: new Date().toISOString(),
      };
      ctx.store.mutate((s) => {
        s.notifications.push(notification);
      });
      return notification;
    },
  };
}
