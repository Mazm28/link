import {
  ActivityIdCodec,
  NotificationIdCodec,
  type Activity,
  type ActivityId,
  type ActivityView,
  type Page,
  type UserId,
} from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type {
  ActivityDraft,
  ActivityPatch,
  ActivityRepository,
  FeedParams,
} from '@core/repositories';
import { rankActivities } from '@core/rules/ranking';
import type { MockContext } from './context';

export function createActivityRepository(ctx: MockContext): ActivityRepository {
  return {
    /** Upholds INV-1 and INV-2 by delegating to the shared read pipeline.
     *  Cursor-based by signature, so a full-list fetch is not expressible. */
    async listFeed(params: FeedParams): Promise<Page<ActivityView>> {
      await ctx.delay();
      return ctx.readActivities({
        viewerId: params.viewerId,
        filters: params.filters,
        cursor: params.cursor,
        limit: params.limit,
        // Drafts and unpublished activities never appear in anyone's feed,
        // including their author's — the author sees them under "my activities".
        scope: (a) => a.status === 'published' || a.status === 'cancelled',
        /* U3 — the real ranking, replacing U1's placeholder order.
         *
         * Built HERE rather than passed in, because the read pipeline is what
         * Round 2's server must reproduce: if ranking were injected by the
         * caller, the server could be given a different one and the oracle
         * test would still pass. */
        rank: (rows) =>
          rankActivities(rows, ctx.viewerContext(params.viewerId), ctx.now(), params.mode),
      });
    },

    async getActivity(viewerId: UserId | null, id: ActivityId): Promise<ActivityView | null> {
      await ctx.delay();
      const page = ctx.readActivities({
        viewerId,
        scope: (a) => a.id === id,
        limit: 1,
      });
      return page.items[0] ?? null;
    },

    async listByAuthor(viewerId: UserId | null, authorId: UserId): Promise<ActivityView[]> {
      await ctx.delay();
      return ctx.readActivities({
        viewerId,
        scope: (a) => a.authorId === authorId,
        limit: 200,
      }).items;
    },

    /**
     * US-11 — `locationPrecision` is a required field on ActivityDraft with no
     * default. There is no value the system could pick that is not a guess
     * about someone's privacy, so the caller must have chosen.
     */
    async create(authorId: UserId, draft: ActivityDraft): Promise<Activity> {
      await ctx.delay();

      if (draft.locationPrecision === 'exact' && !draft.exactAddress?.trim()) {
        refusal(ErrorCode.ADDRESS_REQUIRED, 'errors.addressRequired');
      }

      const activity: Activity = {
        id: ActivityIdCodec.create(),
        authorId,
        authorKind: 'user',
        title: draft.title,
        description: draft.description,
        categoryIds: draft.categoryIds,
        startsAt: draft.startsAt,
        cityId: draft.cityId,
        ...(draft.neighborhoodId === undefined ? {} : { neighborhoodId: draft.neighborhoodId }),
        locationPrecision: draft.locationPrecision,
        status: draft.publish ? 'published' : 'draft',
        // FR-56: written inert so paid placement needs no migration later.
        promotion: { sponsored: false },
        createdAt: new Date().toISOString(),
        ...(draft.exactAddress === undefined ? {} : { exactAddress: draft.exactAddress }),
        /* Stored at BOTH precisions. The poster picked a point; withholding it
         * is the projection's job, not storage's (INV-5). */
        ...(draft.coordinate === undefined ? {} : { coordinate: draft.coordinate }),
        ...(draft.capacity === undefined ? {} : { capacity: draft.capacity }),
        ...(draft.imageUrl === undefined ? {} : { imageUrl: draft.imageUrl }),
      };

      ctx.store.mutate((s) => {
        s.activities.push(activity);
      });
      return activity;
    },

    async update(authorId: UserId, id: ActivityId, patch: ActivityPatch): Promise<Activity> {
      await ctx.delay();
      let result: Activity | undefined;

      ctx.store.mutate((s) => {
        const activity = s.activities.find((a) => a.id === id);
        if (!activity) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        // NFR-S6: the repository is the enforcement boundary. Hiding the edit
        // button is UX; this check is the actual control.
        if (activity.authorId !== authorId) refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');

        if (patch.title !== undefined) activity.title = patch.title;
        if (patch.description !== undefined) activity.description = patch.description;
        if (patch.categoryIds !== undefined) activity.categoryIds = patch.categoryIds;
        if (patch.startsAt !== undefined) activity.startsAt = patch.startsAt;
        if (patch.cityId !== undefined) activity.cityId = patch.cityId;
        if (patch.neighborhoodId !== undefined) activity.neighborhoodId = patch.neighborhoodId;
        if (patch.locationPrecision !== undefined) {
          activity.locationPrecision = patch.locationPrecision;
        }
        if (patch.exactAddress !== undefined) activity.exactAddress = patch.exactAddress;
        if (patch.coordinate !== undefined) activity.coordinate = patch.coordinate;
        if (patch.capacity !== undefined) activity.capacity = patch.capacity;
        if (patch.imageUrl !== undefined) activity.imageUrl = patch.imageUrl;

        result = activity;
      });

      if (!result) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return result;
    },

    async cancel(authorId: UserId, id: ActivityId): Promise<Activity> {
      await ctx.delay();
      let result: Activity | undefined;

      ctx.store.mutate((s) => {
        const activity = s.activities.find((a) => a.id === id);
        if (!activity) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        if (activity.authorId !== authorId) refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');

        activity.status = 'cancelled';
        result = activity;

        /* FR-13: cancellation is visible to everyone who sent a join request.
         * U4 owns the notification feature; the records are written here so
         * the poster's action and its consequence stay in one transaction. */
        for (const request of s.joinRequests) {
          if (request.activityId !== id || request.status !== 'sent') continue;
          s.notifications.push({
            id: NotificationIdCodec.create(),
            userId: request.requesterId,
            kind: 'activity_cancelled',
            channel: 'in_app',
            payload: { activityId: String(id) },
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (!result) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return result;
    },

    /** FR-55 — a counter only. No viewer identity is recorded, so a venue can
     *  never learn WHO looked at its activity, only how many did. */
    async incrementViews(id: ActivityId): Promise<void> {
      await ctx.delay();
      ctx.store.mutate((s) => {
        s.activityViews[id] = (s.activityViews[id] ?? 0) + 1;
      });
    },
  };
}
