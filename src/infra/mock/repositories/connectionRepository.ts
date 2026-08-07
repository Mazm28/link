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
import { canSendRequestTo } from '@core/rules/visibility';
import type { MockContext } from './context';

export function createConnectionRepository(ctx: MockContext): ConnectionRepository {
  const toRequestView = (request: JoinRequest): JoinRequestView => ({
    id: request.id,
    activityId: request.activityId,
    requester: ctx.profileOf(request.requesterId),
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

      const requester = ctx.findUser(input.requesterId);
      if (!requester) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

      // Verify the selection against what the user actually has, and FAIL
      // rather than substitute (US-30). U4 moves this to
      // core/rules/contactSharing with its own property test.
      if (input.sharedContact.kind === 'phone' && !requester.phone) {
        refusal('no_phone_on_file', 'errors.phoneInvalidFormat');
      }
      if (input.sharedContact.kind === 'telegram' && !requester.telegramId) {
        refusal('no_telegram_on_file', 'errors.telegramInvalidFormat');
      }

      const request: JoinRequest = {
        id: RequestIdCodec.create(),
        activityId: input.activityId,
        requesterId: input.requesterId,
        sharedContact: input.sharedContact,
        status: 'sent',
        contactRevoked: false,
        createdAt: new Date().toISOString(),
        ...(input.note === undefined ? {} : { note: input.note }),
      };

      ctx.store.mutate((s) => {
        s.joinRequests.push(request);
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
      return state.joinRequests.filter((r) => r.activityId === activityId).map(toRequestView);
    },

    async listIncomingRequests(posterId: UserId): Promise<JoinRequestView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const mine = new Set(
        state.activities.filter((a) => a.authorId === posterId).map((a) => a.id),
      );
      return state.joinRequests
        .filter((r) => mine.has(r.activityId))
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
        .map(toRequestView);
    },

    /** FR-35 — `SentRequestView` has no field for the poster's contact
     *  details, so the one-way asymmetry holds by type rather than by care. */
    async listSentRequests(requesterId: UserId): Promise<SentRequestView[]> {
      await ctx.delay();
      const state = ctx.store.read();
      const now = ctx.now();

      return state.joinRequests
        .filter((r) => r.requesterId === requesterId)
        .flatMap((request): SentRequestView[] => {
          const activity = state.activities.find((a) => a.id === request.activityId);
          if (!activity) return [];
          return [
            {
              id: request.id,
              activity: projectActivity(
                activity,
                ctx.profileOf(activity.authorId),
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
      if (deriveState(activity, ctx.now()) !== 'past') return [];

      const confirmed = state.attendance
        .filter((a) => a.activityId === activityId && a.attended)
        .map((a) => a.participantId);

      const actorIsParticipant = actorId === activity.authorId || confirmed.includes(actorId);
      if (!actorIsParticipant) return [];

      const alreadyRated = new Set(
        state.ratings
          .filter((r) => r.activityId === activityId && r.raterId === actorId)
          .map((r) => r.subjectId),
      );

      const candidates = [activity.authorId, ...confirmed].filter(
        (id) => id !== actorId && !alreadyRated.has(id),
      );

      return [...new Set(candidates)].map((id) => ctx.profileOf(id));
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

      if (input.raterId === input.subjectId) refusal('self_rating', 'errors.forbidden');
      if (input.score < 1 || input.score > 5) refusal('score_out_of_range', 'errors.forbidden');

      const eligible = await this.listRateableParticipants(input.raterId, input.activityId);
      if (!eligible.some((p) => p.id === input.subjectId)) {
        refusal('not_confirmed_attendee', 'errors.forbidden');
      }

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

    async getRatingSummary(userId: UserId): Promise<RatingSummary> {
      await ctx.delay();
      return ctx.ratingSummary(userId);
    },
  };
}
