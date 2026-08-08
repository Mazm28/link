import type { Notification, UserId } from '../domain';
import { type AppError, err, ok, type Result, RefusalError } from '../errors';
import type { NotificationRepository } from '../repositories';

/* ===========================================================================
 * notificationService — US-40, FR-70…72
 *
 * DEP-4: repository interfaces only, no `infra/` import.
 *
 * ⚠️ NO PUSH, NO EMAIL, AND THE BROWSER NOTIFICATION API IS NEVER CALLED
 * (FR-72, BR-U4-103). There is no `Notification.requestPermission()` anywhere
 * in this codebase and no permission prompt is ever shown. The global
 * `Notification` name below refers to the DOMAIN entity, not the browser API —
 * they collide by name only, and this comment exists so nobody "restores" the
 * browser one thinking it was lost.
 *
 * ⚠️ PAYLOADS CARRY IDS ONLY (NFR-S1, BR-U4-92). A notification must never
 * hold a contact detail. Consumers resolve ids through the repository, where
 * INV-3's scoping applies — a payload carrying the value itself would route
 * around that scoping entirely, and notifications are the most-copied,
 * least-scrutinised objects in any system.
 * =========================================================================== */

async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

/** BR-U4-102 — the kinds the nav badge counts.
 *
 * ⚠️ REQUESTS ONLY, deliberately. US-40 calls the badge the entire retention
 * mechanism for the poster persona, and a number that sometimes means
 * "requests" and sometimes "anything at all" is one nobody can act on. The
 * other three kinds appear on `/notifications` and are never counted here. */
const BADGE_KINDS: ReadonlySet<Notification['kind']> = new Set(['request_received']);

export function createNotificationService(repository: NotificationRepository) {
  return {
    async list(userId: UserId): Promise<Result<Notification[], AppError>> {
      return toResult(async () => {
        const all = await repository.list(userId);
        /* Newest first. Ordering lives here rather than in each screen so the
         * notifications page and any future surface cannot disagree. */
        return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    },

    /**
     * ⚠️ The badge count — unread REQUESTS, not unread notifications.
     *
     * Computed from the list rather than delegating to
     * `repository.getUnreadCount`, which counts everything. Two different
     * numbers with the same name is how a badge starts lying.
     */
    async unreadRequestCount(userId: UserId): Promise<Result<number, AppError>> {
      return toResult(async () => {
        const all = await repository.list(userId);
        return all.filter((n) => n.readAt === undefined && BADGE_KINDS.has(n.kind)).length;
      });
    },

    async markRead(userId: UserId, ids: string[]): Promise<Result<void, AppError>> {
      if (ids.length === 0) return ok(undefined);
      return toResult(() => repository.markRead(userId, ids));
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
