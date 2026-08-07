import type {
  Activity,
  ActivityView,
  ProfileView,
  RatingSummary,
  User,
  UserId,
} from '../domain';
import { deriveState } from './activityLifecycle';
import { areaOf } from './geo';

/* ===========================================================================
 * The projection seam — INV-2 and INV-3.
 *
 * THIS IS THE ENFORCEMENT POINT. Safety rules are applied where data is
 * PRODUCED, not where it is displayed, because a component cannot leak what it
 * was never given. Every repository read ends here, and nothing downstream has
 * a code path back to the withheld fields.
 *
 * OWNERSHIP: U3 owns `core/rules/locationPrecision` and will absorb the
 * precision decision below, extending it as the activity feature grows. U1
 * implements the conservative form now, because the read pipeline exists from
 * this unit onward and every read between U1 and U3 must already be safe.
 * =========================================================================== */

export interface ActivityProjectionContext {
  viewerHasRequested: boolean;
  requestCount: number;
}

/**
 * INV-3 — a User becomes a ProfileView.
 *
 * `ProfileView` has no `phone` and no `telegramId` field, so this function
 * cannot leak them even by mistake: there is nowhere to put them. The
 * conversion is where a stored User stops being able to travel.
 *
 * BR-U2-32 — returns NULL for an account that has not completed setup.
 *
 * That is not a defensive extra check; it is forced. `ProfileView` requires
 * `displayName` and `neighborhoodId`, and an incomplete `User` has neither, so
 * there is no ProfileView to build. The safety property — a half-registered
 * account has no public presence anywhere — therefore falls out of the type
 * rather than depending on every call site remembering to filter.
 */
export function projectProfile(
  user: User,
  rating: RatingSummary,
  isVerifiedVenue = false,
): ProfileView | null {
  /* CR-02 items 2 and 4 relaxed interests and location to optional, so a NAME
   * is what a complete profile now means. The structural guarantee is
   * unchanged — an account without one still cannot be rendered anywhere. */
  if (user.profileCompletedAt === undefined || user.displayName === undefined) {
    return null;
  }

  return {
    id: user.id,
    displayName: user.displayName,
    interestIds: user.interestIds,
    ...(user.homeCityId === undefined ? {} : { cityId: user.homeCityId }),
    ...(user.homeNeighborhoodId === undefined
      ? {}
      : { neighborhoodId: user.homeNeighborhoodId }),
    rating,
    accountType: user.accountType,
    isVerifiedVenue,
    isAnonymized: user.isAnonymized,
    ...(user.avatarId === undefined ? {} : { avatarId: user.avatarId }),
    ...(user.bio === undefined ? {} : { bio: user.bio }),
  };
}

/**
 * INV-2 — an Activity becomes an ActivityView for ONE viewer.
 *
 * `exactAddress` is included only when the precision is `exact`, or when the
 * viewer is the author looking at their own post. Otherwise THE KEY IS OMITTED
 * — not set to an empty string, not set to null.
 *
 * The distinction is the whole point. An empty string is still a field a
 * future feature can read and misinterpret ("we have an address, it's just
 * blank"); an absent key cannot be. `exactOptionalPropertyTypes` in tsconfig
 * keeps "absent" and "present but undefined" as different types so the
 * compiler participates in this, and P-U1-13 pins that the store round trip
 * preserves it.
 *
 * BR-U1-71 — a null viewer (signed out) receives the MOST RESTRICTIVE
 * projection: no exact address for any activity, at any precision. Signed-out
 * browsing is out of scope for Round 1, but defining the null case now stops a
 * future "public preview" feature from quietly becoming the widest data leak
 * in the product. Fail closed by default.
 */
export function projectActivity(
  activity: Activity,
  author: ProfileView,
  viewerId: UserId | null,
  now: Date,
  ctx: ActivityProjectionContext,
): ActivityView {
  const viewerIsAuthor = viewerId !== null && viewerId === activity.authorId;
  /* ONE predicate governs both the address (INV-2) and the point (INV-5).
   * Two separate conditions would be two places to get it wrong, and they
   * would eventually disagree. */
  const maySeeExactLocation =
    viewerId !== null && (activity.locationPrecision === 'exact' || viewerIsAuthor);

  const disclosable = maySeeExactLocation && activity.exactAddress !== undefined;

  /* INV-5. The two branches are mutually exclusive by construction: a view
   * carries a point OR an area, never both, so a map cannot contradict itself
   * and a payload cannot carry the point it is meant to be withholding.
   *
   * `areaOf` takes a NEIGHBOURHOOD ID. It is never handed the activity, so the
   * area cannot be derived from `activity.coordinate` — see core/rules/geo.ts
   * for the three implementations that would leak. */
  const location: Pick<ActivityView, 'coordinate' | 'approximateArea'> = maySeeExactLocation
    ? activity.coordinate === undefined
      ? {}
      : { coordinate: activity.coordinate }
    : (() => {
        const area = areaOf(activity.cityId, activity.neighborhoodId);
        return area === undefined ? {} : { approximateArea: area };
      })();

  return {
    id: activity.id,
    author,
    authorKind: activity.authorKind,
    title: activity.title,
    description: activity.description,
    categoryIds: activity.categoryIds,
    startsAt: activity.startsAt,
    cityId: activity.cityId,
    ...(activity.neighborhoodId === undefined
      ? {}
      : { neighborhoodId: activity.neighborhoodId }),
    locationPrecision: activity.locationPrecision,
    status: activity.status,
    derivedState: deriveState(activity, now),
    viewerHasRequested: ctx.viewerHasRequested,
    requestCount: ctx.requestCount,
    // The only place exactAddress can enter an ActivityView.
    ...(disclosable ? { exactAddress: activity.exactAddress as string } : {}),
    // The only place a coordinate or an area can enter one (INV-5).
    ...location,
    ...(activity.capacity === undefined ? {} : { capacity: activity.capacity }),
    ...(activity.imageUrl === undefined ? {} : { imageUrl: activity.imageUrl }),
  };
}

export function projectActivities(
  activities: readonly Activity[],
  authors: ReadonlyMap<UserId, ProfileView>,
  viewerId: UserId | null,
  now: Date,
  contextFor: (activity: Activity) => ActivityProjectionContext,
  fallbackAuthor: (id: UserId) => ProfileView,
): ActivityView[] {
  return activities.map((activity) =>
    projectActivity(
      activity,
      authors.get(activity.authorId) ?? fallbackAuthor(activity.authorId),
      viewerId,
      now,
      contextFor(activity),
    ),
  );
}
