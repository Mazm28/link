import {
  NotificationIdCodec,
  RatingIdCodec,
  RequestIdCodec,
  type ActivityId,
  type Attendance,
  type JoinRequest,
  type JoinRequestView,
  type ProfileView,
  type Rating,
  type RatingSummary,
  type RequestId,
  type SentRequestView,
  type SharedContact,
  type UserId,
} from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type { ConnectionRepository } from '@core/repositories';
import { deriveState } from '@core/rules/activityLifecycle';
import { projectActivity } from '@core/rules/projection';
import { canSendRequestTo, isHiddenFrom } from '@core/rules/visibility';
import { validateShareSelection } from '@core/rules/contactSharing';
import { canRate, rateableParticipants } from '@core/rules/ratingEligibility';
import { canSendToday, recordSend } from '@core/rules/requestQuota';
import type { MockContext } from './context';

export function createConnectionRepository(ctx: MockContext): ConnectionRepository {
  /** U6 — the viewer is required because `profileOf` now filters by blocks. */
  const toRequestView = (request: JoinRequest, viewerId: UserId | null): JoinRequestView => ({
    id: request.id,
    activityId: request.activityId,
    requester: ctx.profileOf(request.requesterId, viewerId),
    // THE single INV-3 exception, and it is scoped twice over: only on a
    // request, and only when the caller is the poster of the activity that
    // request targets. Both scopes are applied by the callers below.
    sharedContact: request.sharedContact,
    status: request.status,
    contactRevoked: request.contactRevoked,
    createdAt: request.createdAt,
    ...(request.note === undefined ? {} : { note: request.note }),
  });

  return {
    /**
     * US-30 / US-31 — the most safety-sensitive write in the product.
     *
     * `sharedContact` is stored EXACTLY as the requester chose it. There is
     * deliberately no fallback: if someone selects Telegram and has none on
     * file, this refuses rather than quietly sending their phone number
     * instead. Substitution would turn a consented disclosure into one the
     * user never agreed to, which is the whole risk AR-02 accepted.
     *
     * The stored value is a SNAPSHOT, not a reference — if the user later
     * changes their number, this request still records what the poster
     * actually received.
     */
    async sendJoinRequest(input: {
      requesterId: UserId;
      activityId: ActivityId;
      note?: string;
      sharedContact: SharedContact;
    }): Promise<JoinRequest> {
      await ctx.delay();

      const state = ctx.store.read();
      const activity = state.activities.find((a) => a.id === input.activityId);
      if (!activity) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

      if (!canSendRequestTo(input.requesterId, activity.authorId, ctx.blockIndexFor())) {
        refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');
      }

      /* U4 / BR-U4-30 — step 1 of the binding sequence, COMPLETED.
       * Until now only the activity's EXISTENCE was checked, so a request
       * could be sent to an unpublished or already-finished activity. */
      if (activity.status !== 'published') refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');
      if (deriveState(activity, ctx.now()) !== 'upcoming') {
        refusal('activity_not_upcoming', 'errors.forbidden');
      }

      /* BR-U4-35 — you cannot request your own activity. */
      if (activity.authorId === input.requesterId) {
        refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');
      }

      const requester = ctx.findUser(input.requesterId);
      if (!requester) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

      const state2 = ctx.store.read();
      const priorForActivity = state2.joinRequests.filter(
        (r) => r.activityId === input.activityId && r.requesterId === input.requesterId,
      );

      /* U4 / BR-U4-32 — step 3 of the binding sequence, WHICH WAS ABSENT
       * ENTIRELY. US-30's acceptance criteria require a second request to show
       * the existing request's state rather than create a duplicate, and
       * nothing enforced it. */
      if (priorForActivity.some((r) => r.status === 'sent')) {
        refusal('duplicate_request', 'errors.forbidden');
      }

      /* BR-U4-33 — exactly ONE re-request after a withdrawal. Withdrawing a
       * second request is terminal: without that, withdraw-and-resend is a way
       * to sit at the top of a poster's inbox indefinitely. */
      const highestSeq = priorForActivity.reduce((max, r) => Math.max(max, r.requestSeq), 0);
      if (highestSeq >= 2) refusal('rerequest_exhausted', 'errors.forbidden');
      const requestSeq: 1 | 2 = highestSeq === 1 ? 2 : 1;

      /* BR-U4-36 — the daily courtesy limit. ⚠️ NOT a security control: it
       * lives in localStorage and resets when storage is cleared. It replaces
       * part of the guard CR-07 removed with US-32; real enforcement is
       * server-side in Round 2 (US-34). */
      const quota = canSendToday(input.requesterId, state2.requestQuotas ?? [], ctx.now());
      if (!quota.allowed) refusal('daily_limit_reached', 'errors.forbidden');

      /* BR-U4-11/13 — resolve through the pure rule rather than inline, so the
       * UI, this repository and Round 2's server all reach the same answer.
       * ⚠️ It FAILS rather than substituting a different channel. */
      const validation = validateShareSelection(
        input.sharedContact.kind,
        requester,
        input.sharedContact.kind === 'telegram' ? input.sharedContact.value : undefined,
      );
      if (!validation.valid) refusal(validation.reason, 'errors.forbidden');

      const request: JoinRequest = {
        id: RequestIdCodec.create(),
        activityId: input.activityId,
        requesterId: input.requesterId,
        sharedContact: validation.resolved,
        status: 'sent',
        contactRevoked: false,
        createdAt: new Date().toISOString(),
        requestSeq,
        ...(input.note === undefined ? {} : { note: input.note }),
      };

      ctx.store.mutate((s) => {
        s.joinRequests.push(request);
        s.requestQuotas = recordSend(input.requesterId, s.requestQuotas ?? [], ctx.now());
        s.notifications.push({
          id: NotificationIdCodec.create(),
          userId: activity.authorId,
          kind: 'request_received',
          channel: 'in_app',
          // IDs only. A notification payload must never carry the contact
          // detail itself (NFR-S1).
          payload: { requestId: String(request.id), activityId: String(activity.id) },
          createdAt: request.createdAt,
        });
      });

      return request;
    },

    /**
     * US-33 — withdrawal marks the contact as revoked. It does NOT undo the
     * disclosure, and the UI must not imply otherwise: the poster may already
     * have written the number down. Being honest about this is the point.
     */
    async withdrawRequest(requesterId: UserId, requestId: RequestId): Promise<JoinRequest> {
      await ctx.delay();
      let result: JoinRequest | undefined;

      ctx.store.mutate((s) => {
        const request = s.joinRequests.find((r) => r.id === requestId);
        if (!request) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        if (request.requesterId !== requesterId) refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');

        request.status = 'withdrawn';
        request.contactRevoked = true;
        request.withdrawnAt = new Date().toISOString();
        result = request;
      });

      if (!result) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return result;
    },

    async listRequestsForActivity(
      posterId: UserId,
      activityId: ActivityId,
    ): Promise<JoinRequestView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const activity = state.activities.find((a) => a.id === activityId);
      // INV-3 scope: contact details are returned only to the poster of this
      // activity. Anyone else asking gets nothing at all, not a redacted list.
      if (!activity || activity.authorId !== posterId) return [];
      /* U6 / BR-U6-30 — a blocked requester's request is absent entirely. */
      const blocks = ctx.blockIndexFor();
      return state.joinRequests
        .filter((r) => r.activityId === activityId)
        .filter((r) => !isHiddenFrom(posterId, r.requesterId, blocks))
        .map((r) => toRequestView(r, posterId));
    },

    async listIncomingRequests(posterId: UserId): Promise<JoinRequestView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const mine = new Set(
        state.activities.filter((a) => a.authorId === posterId).map((a) => a.id),
      );
      /* U6 / BR-U6-30 — filtered BEFORE the sort and before projection
       * (BR-U6-32). A blocked person's request disappears from the inbox
       * entirely (answer Q2 `A`). */
      const blocks = ctx.blockIndexFor();
      return state.joinRequests
        .filter((r) => mine.has(r.activityId))
        .filter((r) => !isHiddenFrom(posterId, r.requesterId, blocks))
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
        .map((r) => toRequestView(r, posterId));
    },

    /** FR-35 — `SentRequestView` has no field for the poster's contact
     *  details, so the one-way asymmetry holds by type rather than by care. */
    async listSentRequests(requesterId: UserId): Promise<SentRequestView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const now = ctx.now();

      /* U6 / BR-U6-30 — a sent request whose POSTER is blocked disappears. */
      const blocks = ctx.blockIndexFor();
      return state.joinRequests
        .filter((r) => r.requesterId === requesterId)
        .flatMap((request): SentRequestView[] => {
          const activity = state.activities.find((a) => a.id === request.activityId);
          if (!activity) return [];
          if (isHiddenFrom(requesterId, activity.authorId, blocks)) return [];
          return [
            {
              id: request.id,
              activity: projectActivity(
                activity,
                ctx.profileOf(activity.authorId, requesterId),
                requesterId,
                now,
                {
                  viewerHasRequested: true,
                  requestCount: ctx.requestCount(activity.id),
                },
              ),
              sharedContact: request.sharedContact,
              status: request.status,
              contactRevoked: request.contactRevoked,
              createdAt: request.createdAt,
            },
          ];
        });
    },

    /** US-50 / FR-40 — only the poster confirms, and only after the date. */
    async confirmAttendance(input: {
      posterId: UserId;
      activityId: ActivityId;
      confirmations: Array<{ participantId: UserId; attended: boolean }>;
    }): Promise<Attendance[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const activity = state.activities.find((a) => a.id === input.activityId);
      if (!activity) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      if (activity.authorId !== input.posterId) refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');
      if (deriveState(activity, ctx.now()) !== 'past') {
        refusal('activity_not_past', 'errors.forbidden');
      }

      const confirmedAt = new Date().toISOString();
      const written: Attendance[] = [];

      ctx.store.mutate((s) => {
        for (const c of input.confirmations) {
          const existing = s.attendance.find(
            (x) => x.activityId === input.activityId && x.participantId === c.participantId,
          );
          if (existing) {
            existing.attended = c.attended;
            existing.confirmedAt = confirmedAt;
            written.push(existing);
          } else {
            const record: Attendance = {
              activityId: input.activityId,
              participantId: c.participantId,
              attended: c.attended,
              confirmedByUserId: input.posterId,
              confirmedAt,
            };
            s.attendance.push(record);
            written.push(record);
          }
        }
      });

      return written;
    },

    async listAttendance(activityId: ActivityId): Promise<Attendance[]> {
      await ctx.delay();
      return ctx.store.read().attendance.filter((a) => a.activityId === activityId);
    },

    /**
     * US-52 / FR-45 — the eligibility gate.
     *
     * U4 owns `core/rules/ratingEligibility` and the property test covering
     * every combination of request state, attendance state, actor role and
     * date. U1 implements the conservative form: only the poster and CONFIRMED
     * attendees, only after the date, and never someone already rated.
     *
     * Note what is refused: someone with NO attendance record is refused, and
     * so is someone confirmed as absent. They are different states — the
     * poster's UI distinguishes pending from no-show — but neither may rate.
     */
    async listRateableParticipants(
      actorId: UserId,
      activityId: ActivityId,
    ): Promise<ProfileView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const activity = state.activities.find((a) => a.id === activityId);
      if (!activity) return [];

      /* U4 — DELEGATED. The reasoning that used to live inline here now lives
       * in `core/rules/ratingEligibility`, built on `canRate`, so the list and
       * the predicate cannot disagree. They would have disagreed exactly at
       * the edges, where it matters: the UI would offer a write the store then
       * refuses, or hide one it would have allowed. */
      return (
        rateableParticipants({
          actorId,
          activity,
          attendance: state.attendance,
          existingRatings: state.ratings,
          now: ctx.now(),
        })
          /* U6 / BR-U6-30 — never offer a blocked person to rate. */
          .filter((id) => !isHiddenFrom(actorId, id, ctx.blockIndexFor()))
          .map((id) => ctx.profileOf(id, actorId))
      );
    },

    /**
     * The write re-checks eligibility rather than trusting that the UI only
     * offered rateable people. Hiding a control is not the check
     * (NFR-S6) — and in Round 2 the server runs this same rule.
     */
    async submitRating(input: {
      raterId: UserId;
      subjectId: UserId;
      activityId: ActivityId;
      score: number;
      comment?: string;
    }): Promise<Rating> {
      await ctx.delay();

      /* BR-U4-64 — score is validated before eligibility, so an out-of-range
       * score reports itself rather than being masked by a permission error. */
      if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
        refusal('score_out_of_range', 'errors.forbidden');
      }

      const state = ctx.store.read();
      const activity = state.activities.find((a) => a.id === input.activityId);
      if (!activity) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

      /* ⚠️ BR-U4-63 — THE WRITE RE-CHECKS, and it calls the SAME pure function
       * the UI called. Hiding a control is not the check (NFR-S6): the
       * operation is reachable by anyone who can reach the repository, and in
       * Round 2 the server runs this identical function again.
       *
       * Delegated rather than re-derived from `listRateableParticipants` — the
       * typed reason is what lets the UI say WHY, and a list cannot. */
      const eligibility = canRate({
        actorId: input.raterId,
        subjectId: input.subjectId,
        activity,
        attendance: state.attendance,
        existingRatings: state.ratings,
        now: ctx.now(),
      });
      if (!eligibility.allowed) refusal(eligibility.reason, 'errors.forbidden');

      const rating: Rating = {
        id: RatingIdCodec.create(),
        activityId: input.activityId,
        raterId: input.raterId,
        subjectId: input.subjectId,
        score: input.score,
        createdAt: new Date().toISOString(),
        ...(input.comment === undefined ? {} : { comment: input.comment }),
      };

      ctx.store.mutate((s) => {
        s.ratings.push(rating);
        s.notifications.push({
          id: NotificationIdCodec.create(),
          userId: input.subjectId,
          kind: 'rating_received',
          channel: 'in_app',
          payload: { activityId: String(input.activityId) },
          createdAt: rating.createdAt,
        });
      });

      return rating;
    },

    /** ⚠️ U6 / AR-05 — viewer-scoped. Ratings from anyone the viewer has
     *  blocked are excluded. See `ctx.ratingSummary` for why this must never
     *  be memoized by subject id alone. */
    async getRatingSummary(userId: UserId, viewerId: UserId | null): Promise<RatingSummary> {
      await ctx.delay();
      return ctx.ratingSummary(userId, viewerId);
    },
  };
}
