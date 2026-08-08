import type {
  ActivityId,
  Attendance,
  JoinRequest,
  JoinRequestView,
  ProfileView,
  Rating,
  RatingSummary,
  RequestId,
  SentRequestView,
  User,
  UserId,
} from '../domain';
import { type AppError, appError, ErrorCode, err, ok, type Result, RefusalError } from '../errors';
import type { ConnectionRepository } from '../repositories';
import {
  requiresDisclosure,
  validateShareSelection,
  type ShareSelection,
} from '../rules/contactSharing';

/* ===========================================================================
 * connectionService — services.md §4.4
 *
 * ⚠️ THE HIGHEST SAFETY SENSITIVITY IN THE PRODUCT. This service owns the
 * moment a real person's phone number reaches a stranger, and the moment a
 * reputation number gets written. Both are irreversible from the user's side.
 *
 * DEP-4: repository interfaces only, no `infra/` import.
 *
 * The seven-step `sendJoinRequest` sequence is BINDING and is enforced in the
 * repository, where it is closest to the write. This service validates what it
 * can BEFORE the round trip so the UI can react without a failed request —
 * it does not re-order or replace those steps.
 * =========================================================================== */

async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

export interface SendRequestInput {
  requester: User;
  activityId: ActivityId;
  selection: ShareSelection;
  /** BR-U4-14 — typed at request time, used for THIS request, never saved to
   *  the profile. Sharing a handle with one host is not a decision to publish
   *  it on a profile everyone can see. */
  providedTelegramId?: string;
  note?: string;
}

export function createConnectionService(repository: ConnectionRepository) {
  return {
    /**
     * ⚠️ US-30 / US-31.
     *
     * Validation runs here first so the requester learns their Telegram handle
     * is missing BEFORE the disclosure is shown — being told "this is sent
     * immediately and cannot be recalled" about a channel that then fails is
     * the worst possible ordering.
     *
     * ⚠️ It NEVER substitutes. If they chose Telegram and have none, this
     * fails and the UI prompts. It does not quietly send their phone number.
     */
    async sendJoinRequest(input: SendRequestInput): Promise<Result<JoinRequest, AppError>> {
      const validation = validateShareSelection(
        input.selection,
        input.requester,
        input.providedTelegramId,
      );

      if (!validation.valid) {
        return err(appError(validation.reason, 'errors.forbidden'));
      }

      return toResult(() =>
        repository.sendJoinRequest({
          requesterId: input.requester.id,
          activityId: input.activityId,
          sharedContact: validation.resolved,
          ...(input.note === undefined ? {} : { note: input.note }),
        }),
      );
    },

    /**
     * Whether the mandatory disclosure must render for this selection.
     *
     * Always true since CR-07 (BR-U4-23). Exposed through the service so the
     * sheet asks a question rather than hard-coding an answer — the rule has
     * varied once already.
     */
    requiresDisclosure(selection: ShareSelection): boolean {
      return requiresDisclosure(selection);
    },

    /**
     * US-33 — withdrawal.
     *
     * ⚠️ This revokes a flag. It does NOT undo the disclosure, and the caller
     * must say so: the poster may already have written the number down. A
     * withdrawal UI implying recall would be false, and worse than not
     * offering withdrawal at all.
     */
    async withdrawRequest(
      requesterId: UserId,
      requestId: RequestId,
    ): Promise<Result<JoinRequest, AppError>> {
      return toResult(() => repository.withdrawRequest(requesterId, requestId));
    },

    /** ⚠️ THE INV-3 GATE. Scoping to the poster is the repository's job, and
     *  no other read path returns another person's contact detail. */
    async listIncomingRequests(posterId: UserId): Promise<Result<JoinRequestView[], AppError>> {
      return toResult(() => repository.listIncomingRequests(posterId));
    },

    async listRequestsForActivity(
      posterId: UserId,
      activityId: ActivityId,
    ): Promise<Result<JoinRequestView[], AppError>> {
      return toResult(() => repository.listRequestsForActivity(posterId, activityId));
    },

    /** FR-35 — `SentRequestView` has no field for the poster's contact
     *  details, so the one-way asymmetry holds by type rather than by care. */
    async listSentRequests(requesterId: UserId): Promise<Result<SentRequestView[], AppError>> {
      return toResult(() => repository.listSentRequests(requesterId));
    },

    /** US-50 — poster only, after the date. Both enforced in the repository. */
    async confirmAttendance(input: {
      posterId: UserId;
      activityId: ActivityId;
      confirmations: Array<{ participantId: UserId; attended: boolean }>;
    }): Promise<Result<Attendance[], AppError>> {
      /* An empty confirmation list is a caller bug, not a user action — the
       * screen always sends at least one row. Refused rather than silently
       * writing nothing, so it surfaces instead of looking like it worked. */
      if (input.confirmations.length === 0) {
        return err(appError(ErrorCode.FORBIDDEN, 'errors.forbidden'));
      }
      return toResult(() => repository.confirmAttendance(input));
    },

    async listAttendance(activityId: ActivityId): Promise<Result<Attendance[], AppError>> {
      return toResult(() => repository.listAttendance(activityId));
    },

    async listRateableParticipants(
      actorId: UserId,
      activityId: ActivityId,
    ): Promise<Result<ProfileView[], AppError>> {
      return toResult(() => repository.listRateableParticipants(actorId, activityId));
    },

    /**
     * ⚠️ US-51 / US-52.
     *
     * The repository re-runs `canRate` before writing (BR-U4-63). This service
     * deliberately does NOT pre-check it: a second copy of the decision here
     * would be a second place for it to drift, and the write is the only check
     * that matters. Hiding a control is not the check — neither is a service
     * guard the caller can skip.
     */
    async submitRating(input: {
      raterId: UserId;
      subjectId: UserId;
      activityId: ActivityId;
      score: number;
      comment?: string;
    }): Promise<Result<Rating, AppError>> {
      return toResult(() => repository.submitRating(input));
    },

    async getRatingSummary(userId: UserId): Promise<Result<RatingSummary, AppError>> {
      return toResult(() => repository.getRatingSummary(userId));
    },
  };
}

export type ConnectionService = ReturnType<typeof createConnectionService>;
