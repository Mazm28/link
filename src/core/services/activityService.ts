import type {
  Activity,
  ActivityId,
  ActivityView,
  CityId,
  Page,
  User,
  UserId,
} from '../domain';
import { type AppError, ErrorCode, appError, err, ok, type Result, RefusalError } from '../errors';
import type { ActivityFilters, ActivityRepository } from '../repositories';
import { editableFields, mayCancel } from '../rules/activityLifecycle';
import {
  validateActivityDraft,
  type ActivityDraftInput,
} from '../rules/activityValidation';
import { mayActInPublic } from '../rules/onboarding';
import {
  effectiveMode,
  modeIsAvailable,
  type FeedMode,
  type ViewerContext,
} from '../rules/ranking';
import type { ValidationResult } from '../rules/profileValidation';

/* ===========================================================================
 * activityService — services.md §4.3, business-logic-model.md §1
 *
 * DEP-4: repository interfaces only, no `infra/` import.
 * =========================================================================== */

async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

export interface FeedRequest {
  viewer: User | null;
  cityId: CityId;
  mode: FeedMode;
  filters?: ActivityFilters | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface FeedResult {
  page: Page<ActivityView>;
  /** The mode actually used. Differs from the requested one when its input is
   *  missing — the screen shows a banner rather than substituting silently. */
  appliedMode: FeedMode;
  requestedModeAvailable: boolean;
}

export function viewerContextOf(user: User | null): ViewerContext {
  return {
    ...(user?.homeNeighborhoodId === undefined ? {} : { neighborhoodId: user.homeNeighborhoodId }),
    interestIds: user?.interestIds ?? [],
  };
}

export function createActivityService(repository: ActivityRepository) {
  return {
    /**
     * BR-U3-06 — only a completed, active, non-anonymized account may publish.
     * `mayActInPublic` was written in U2 and had no caller until now.
     */
    async createActivity(
      author: User,
      input: ActivityDraftInput,
      now: Date,
    ): Promise<ValidationResult<Activity>> {
      if (!mayActInPublic(author)) {
        return {
          ok: false,
          errors: {
            form: appError(ErrorCode.PROFILE_INCOMPLETE, 'errors.profileIncomplete'),
          },
        };
      }

      /* ⚠️ Validation refuses when no precision was chosen (BR-U3-10). There is
       * no default to fall back on: `exact` would leak by omission, and
       * `neighborhood` would quietly override an intent the poster never
       * expressed. */
      const validated = validateActivityDraft(input, now);
      if (!validated.ok) return validated;

      const written = await toResult(() => repository.create(author.id, validated.value));
      return written.ok
        ? { ok: true, value: written.value }
        : { ok: false, errors: { form: written.error } };
    },

    async editActivity(
      author: User,
      activity: Activity,
      input: ActivityDraftInput,
      now: Date,
    ): Promise<ValidationResult<Activity>> {
      const editable = editableFields(activity, now);
      if (editable === 'none') {
        return { ok: false, errors: { form: appError(ErrorCode.FORBIDDEN, 'errors.forbidden') } };
      }

      const validated = validateActivityDraft(input, now);
      if (!validated.ok) return validated;

      /* BR-U3-32 — a past activity accepts a description edit and nothing
       * else. Narrowing the patch here rather than refusing the whole save
       * means a host can still post "thanks, next one in two weeks". */
      const patch =
        editable === 'description-only'
          ? { description: validated.value.description }
          : validated.value;

      const written = await toResult(() => repository.update(author.id, activity.id, patch));
      return written.ok
        ? { ok: true, value: written.value }
        : { ok: false, errors: { form: written.error } };
    },

    /**
     * BR-U3-33 — cancelling notifies every requester.
     *
     * U4 SEAM: the repository records the cancellation; `notificationService`
     * delivers. U3 defines the trigger so U4 does not have to rediscover which
     * events fan out.
     */
    async cancelActivity(
      author: User,
      activity: Activity,
      now: Date,
    ): Promise<Result<Activity, AppError>> {
      if (!mayCancel(activity, now)) {
        return err(appError(ErrorCode.FORBIDDEN, 'errors.forbidden'));
      }
      return toResult(() => repository.cancel(author.id, activity.id));
    },

    /** BR-U3-64/65 — falls back visibly rather than substituting silently. */
    async getFeed(request: FeedRequest): Promise<Result<FeedResult, AppError>> {
      const viewer = viewerContextOf(request.viewer);
      const applied = effectiveMode(request.mode, viewer);

      const page = await toResult(() =>
        repository.listFeed({
          viewerId: request.viewer?.id ?? null,
          mode: applied,
          limit: request.limit ?? 20,
          filters: {
            ...request.filters,
            cityId: request.cityId,
            /* BR-U3-40 — past activities have left discovery entirely. Set
             * here, not offered as a toggle: the control that used to expose
             * them was removed with the rule. */
            excludePast: true,
          },
          ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
        }),
      );

      if (!page.ok) return err(page.error);

      return ok({
        page: page.value,
        appliedMode: applied,
        requestedModeAvailable: modeIsAvailable(request.mode, viewer),
      });
    },

    async getActivity(viewerId: UserId | null, id: ActivityId): Promise<ActivityView | null> {
      return repository.getActivity(viewerId, id);
    },

    /** US-13 and the author's public profile. Past activities live here and
     *  nowhere else in discovery (BR-U3-41). */
    async listByAuthor(viewerId: UserId | null, authorId: UserId): Promise<ActivityView[]> {
      return repository.listByAuthor(viewerId, authorId);
    },
  };
}

export type ActivityService = ReturnType<typeof createActivityService>;
