import {
  ActivityIdCodec,
  cityId,
  VenueIdCodec,
  type Activity,
  type ActivityId,
  type ActivityView,
  type UserId,
  type Venue,
  type VenueId,
  type VerificationStatus,
} from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type {
  VenueActivityDraft,
  VenueApplication,
  VenueMetrics,
  VenuePublicView,
  VenueRepository,
} from '@core/repositories';
import { ALL_NEIGHBORHOOD_BY_ID } from '@core/reference/neighborhoods';
import type { MockContext } from './context';

export function createVenueRepository(ctx: MockContext): VenueRepository {
  return {
    /**
     * FR-51 — a new venue starts `pending`.
     *
     * KNOWN GAP, carried in the Deferrals Register: there is no approver until
     * Round 3, so a real registration made in Round 1 would sit here forever.
     * The seed ships approved venues so the demo works. Round 2 must supply an
     * approval path.
     */
    async register(userId: UserId, application: VenueApplication): Promise<Venue> {
      await ctx.delay();
      const venue: Venue = {
        id: VenueIdCodec.create(),
        ownerUserId: userId,
        businessName: application.businessName,
        description: application.description,
        address: application.address,
        neighborhoodId: application.neighborhoodId,
        contactInfo: application.contactInfo,
        verificationStatus: 'pending',
        createdAt: new Date().toISOString(),
        ...(application.logoUrl === undefined ? {} : { logoUrl: application.logoUrl }),
        ...(application.photoUrls === undefined ? {} : { photoUrls: application.photoUrls }),
      };

      ctx.store.mutate((s) => {
        s.venues.push(venue);
      });
      return venue;
    },

    async getVenueForUser(userId: UserId): Promise<Venue | null> {
      await ctx.delay();
      return ctx.store.read().venues.find((v) => v.ownerUserId === userId) ?? null;
    },

    async getVenueProfile(
      _viewerId: UserId | null,
      venueId: VenueId,
    ): Promise<VenuePublicView | null> {
      await ctx.delay();
      const venue = ctx.store.read().venues.find((v) => v.id === venueId);
      if (!venue) return null;

      return {
        id: venue.id,
        businessName: venue.businessName,
        description: venue.description,
        // FR-54: a venue address is ALWAYS public. The asymmetry against a
        // person's activity address is deliberate — a café has no reason to
        // hide where it is, and a person's home does.
        address: venue.address,
        neighborhoodId: venue.neighborhoodId,
        contactInfo: venue.contactInfo,
        isVerified: venue.verificationStatus === 'approved',
        ...(venue.logoUrl === undefined ? {} : { logoUrl: venue.logoUrl }),
        ...(venue.photoUrls === undefined ? {} : { photoUrls: venue.photoUrls }),
      };
    },

    /**
     * FR-52 — an unapproved venue cannot publish at all.
     * FR-54 — venue activities are always exact.
     *
     * `VenueActivityDraft` has no `locationPrecision` field. Removing the
     * choice is stronger than defaulting it: there is no code path here that
     * can produce a neighborhood-precision venue activity, so no future edit
     * can accidentally introduce one.
     */
    async publishActivity(venueId: VenueId, draft: VenueActivityDraft): Promise<Activity> {
      await ctx.delay();
      const venue = ctx.store.read().venues.find((v) => v.id === venueId);
      if (!venue) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      if (venue.verificationStatus !== 'approved') {
        refusal('venue_not_approved', 'errors.forbidden');
      }

      const activity: Activity = {
        id: ActivityIdCodec.create(),
        authorId: venue.ownerUserId,
        authorKind: 'venue',
        venueId: venue.id,
        title: draft.title,
        description: draft.description,
        categoryIds: draft.categoryIds,
        startsAt: draft.startsAt,
        /* A venue's city follows its neighborhood — venues are always in one
         * of the five cities that have them (FR-54). */
        cityId: ALL_NEIGHBORHOOD_BY_ID.get(venue.neighborhoodId)?.cityId ?? cityId('tehran'),
        neighborhoodId: venue.neighborhoodId,
        locationPrecision: 'exact',
        exactAddress: draft.exactAddress,
        status: draft.publish ? 'published' : 'draft',
        promotion: draft.promotion ?? { sponsored: false },
        createdAt: new Date().toISOString(),
        ...(draft.capacity === undefined ? {} : { capacity: draft.capacity }),
        ...(draft.imageUrl === undefined ? {} : { imageUrl: draft.imageUrl }),
        ...(draft.recurrence === undefined ? {} : { recurrence: draft.recurrence }),
      };

      ctx.store.mutate((s) => {
        s.activities.push(activity);
      });
      return activity;
    },

    async listVenueActivities(venueId: VenueId): Promise<ActivityView[]> {
      await ctx.delay();
      const venue = ctx.store.read().venues.find((v) => v.id === venueId);
      if (!venue) return [];
      return ctx.readActivities({
        viewerId: venue.ownerUserId,
        scope: (a) => a.venueId === venueId,
        limit: 200,
      }).items;
    },

    /** FR-55 — counts only. A venue learns how many people were interested,
     *  never who: no viewer identity is stored or returned. */
    async getMetrics(venueId: VenueId, activityId?: ActivityId): Promise<VenueMetrics> {
      await ctx.delay();
      const state = ctx.store.read();
      const activities = state.activities.filter(
        (a) => a.venueId === venueId && (activityId === undefined || a.id === activityId),
      );

      const perActivity = activities.map((a) => ({
        activityId: a.id,
        views: state.activityViews[a.id] ?? 0,
        requestCount: ctx.requestCount(a.id),
      }));

      return {
        views: perActivity.reduce((sum, x) => sum + x.views, 0),
        requestCount: perActivity.reduce((sum, x) => sum + x.requestCount, 0),
        perActivity,
      };
    },

    /* ------------------------------------------------- Round 3, declared now */

    async listPendingApplications(adminId: UserId): Promise<Venue[]> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      return ctx.store.read().venues.filter((v) => v.verificationStatus === 'pending');
    },

    async setVerificationStatus(
      adminId: UserId,
      venueId: VenueId,
      status: VerificationStatus,
    ): Promise<Venue> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      let result: Venue | undefined;
      ctx.store.mutate((s) => {
        const venue = s.venues.find((v) => v.id === venueId);
        if (!venue) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        venue.verificationStatus = status;
        result = venue;
      });
      if (!result) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return result;
    },
  };
}

/** Round 1 has no admin accounts, so this always refuses. It exists now so
 *  Round 3 adds accounts rather than adding an enforcement point. */
export function requireAdmin(ctx: MockContext, adminId: UserId): void {
  if (ctx.findUser(adminId)?.accountType !== 'admin') {
    refusal(ErrorCode.FORBIDDEN, 'errors.forbidden');
  }
}
