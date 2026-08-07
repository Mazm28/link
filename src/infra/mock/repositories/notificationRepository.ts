import { NotificationIdCodec, type Notification, type UserId } from '@core/domain';
import type { CreateNotificationInput, NotificationRepository } from '@core/repositories';
import type { MockContext } from './context';

export function createNotificationRepository(ctx: MockContext): NotificationRepository {
  return {
    async list(userId: UserId): Promise<Notification[]> {
      await ctx.delay();
      return ctx.store
        .read()
        .notifications.filter((n) => n.userId === userId)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    },

    /** Drives the nav badge, which per personas.md is the product's only
     *  retention mechanism — there are no push notifications and no email. */
    async getUnreadCount(userId: UserId): Promise<number> {
      await ctx.delay();
      return ctx.store
        .read()
        .notifications.filter((n) => n.userId === userId && n.readAt === undefined).length;
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
