import type { ActivityId, Block, ProfileView, Report, ReportReason, UserId } from '../domain';
import { type AppError, appError, ErrorCode, err, ok, type Result, RefusalError } from '../errors';
import type { SafetyRepository } from '../repositories';

/* ===========================================================================
 * safetyService — U6, US-70 / US-71 / ⚠️ US-72
 *
 * DEP-4: repository interfaces only, no `infra/` import.
 *
 * ⚠️ THIS SERVICE DOES NOT FILTER ANYTHING. Block visibility is applied inside
 * the repository reads (BR-U6-32), before projection and before pagination.
 * A filter here would be a SECOND implementation of INV-1 — and the one that
 * no property test covers, because P-U6-01 exercises the repository.
 * =========================================================================== */

async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

export interface ReportUserInput {
  reporterId: UserId;
  subjectUserId: UserId;
  reasonCode: ReportReason;
  detail?: string;
  /** Context when reporting someone met through a specific activity. */
  relatedActivityId?: ActivityId;
}

export interface ReportActivityInput {
  reporterId: UserId;
  subjectActivityId: ActivityId;
  reasonCode: ReportReason;
  detail?: string;
}

export function createSafetyService(repository: SafetyRepository) {
  return {
    /**
     * US-70 — report a person.
     *
     * ⚠️ `detail` carries unusual weight. Because there is no in-app chat
     * (AR-04), the app holds NO record of contact that happened on Telegram or
     * by phone — so for the harassment case this free text is the only
     * evidence that will ever exist.
     *
     * ⚠️ `evidenceUrls` is never populated in Round 1 (BR-U6-43). There is no
     * file storage, and an input that silently discarded an attachment would
     * be worse than not offering one.
     */
    async reportUser(input: ReportUserInput): Promise<Result<Report, AppError>> {
      /* BR-U6-47 — you cannot report yourself. */
      if (input.reporterId === input.subjectUserId) {
        return err(appError(ErrorCode.FORBIDDEN, 'errors.forbidden'));
      }

      return toResult(() =>
        repository.reportUser({
          reporterId: input.reporterId,
          subjectUserId: input.subjectUserId,
          subjectKind: 'user',
          reasonCode: input.reasonCode,
          ...(input.detail === undefined ? {} : { detail: input.detail }),
          ...(input.relatedActivityId === undefined
            ? {}
            : { relatedActivityId: input.relatedActivityId }),
        }),
      );
    },

    /** US-71 — report an activity. Self-report is refused by the caller, which
     *  knows the author; the repository has the activity and re-checks. */
    async reportActivity(input: ReportActivityInput): Promise<Result<Report, AppError>> {
      return toResult(() =>
        repository.reportActivity({
          reporterId: input.reporterId,
          subjectActivityId: input.subjectActivityId,
          subjectKind: 'activity',
          reasonCode: input.reasonCode,
          ...(input.detail === undefined ? {} : { detail: input.detail }),
        }),
      );
    },

    /**
     * ⚠️ US-72 — block. SAFETY-CRITICAL, and the smallest function here.
     *
     * No reason is asked for (BR-U6-10): requiring a justification makes the
     * safest action the most effortful one, and the person taking it is by
     * definition someone who wants less interaction, not more.
     *
     * ⚠️ THE BLOCKED PERSON IS NOT NOTIFIED (BR-U6-12). Nothing anywhere tells
     * them. Telling them converts a safety action into a confrontation.
     *
     * ⚠️ NOTHING IS DELETED (BR-U6-15). Ratings, attendance, requests and
     * reports all persist and are filtered on read — which is what makes
     * `unblockUser` restore the previous state exactly, rather than having to
     * reconstruct it from information that would by then be gone.
     */
    async blockUser(blockerId: UserId, blockedId: UserId): Promise<Result<Block, AppError>> {
      /* BR-U6-14 — you cannot block yourself. */
      if (blockerId === blockedId) {
        return err(appError(ErrorCode.FORBIDDEN, 'errors.forbidden'));
      }
      return toResult(() => repository.blockUser(blockerId, blockedId));
    },

    /** US-72 — unblock. Restoration is a consequence of BR-U6-15, not a
     *  procedure: there is no prior state to rebuild because none was lost. */
    async unblockUser(blockerId: UserId, blockedId: UserId): Promise<Result<void, AppError>> {
      return toResult(() => repository.unblockUser(blockerId, blockedId));
    },

    /**
     * ⚠️ BR-U6-22 — people the viewer BLOCKED, never people who blocked them.
     *
     * The repository enforces the direction. Returning the other side would
     * tell someone they had been blocked, defeating BR-U6-12 by a second
     * route — the list would become the notification the design refuses to
     * send.
     */
    async listBlocks(userId: UserId): Promise<Result<ProfileView[], AppError>> {
      return toResult(() => repository.listBlocks(userId));
    },
  };
}

export type SafetyService = ReturnType<typeof createSafetyService>;
