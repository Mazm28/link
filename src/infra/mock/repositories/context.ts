import type {
  Activity,
  ActivityView,
  BlockIndex,
  Page,
  ProfileView,
  RatingSummary,
  User,
  UserId,
} from '@core/domain';
import type { ActivityFilters } from '@core/repositories';
import { buildBlockIndex, filterVisibleActivities } from '@core/rules/visibility';
import { projectActivity } from '@core/rules/projection';
import { deriveState } from '@core/rules/activityLifecycle';
import { projectProfile } from '@core/rules/projection';
import { applyFilters as applyActivityFilters } from '@core/rules/filters';
import type { ViewerContext } from '@core/rules/ranking';
import { simulateLatency } from '../LocalStore';
import type { LocalStore } from '../LocalStore';

/**
 * U4 owns the real value (application-design.md §10). Named so that setting it
 * is a one-line change rather than a hunt through render code.
 */
export const NEW_MEMBER_RATING_THRESHOLD = 3;

const DEFAULT_PAGE_LIMIT = 20;

/**
 * Shared read/write context for the mock repositories.
 *
 * The scoped-read pipeline lives here, in ONE place, so that every repository
 * read goes through the same ordered stages. Six repositories each
 * implementing their own "remember to filter blocks" step is exactly how one
 * of them ends up not doing it.
 */
export class MockContext {
  constructor(readonly store: LocalStore) {}

  async delay(): Promise<void> {
    await simulateLatency();
  }

  now(): Date {
    return new Date();
  }

  /* --------------------------------------------------------- lookups */

  findUser(id: UserId): User | undefined {
    return this.store.read().users.find((u) => u.id === id);
  }

  /** The viewer's ranking inputs. Both may be absent after CR-02 made
   *  interests and location optional — `ranking` drops a term rather than
   *  scoring it zero (BR-U3-61). */
  viewerContext(viewerId: UserId | null): ViewerContext {
    const user = viewerId === null ? undefined : this.findUser(viewerId);
    return {
      ...(user?.homeNeighborhoodId === undefined
        ? {}
        : { neighborhoodId: user.homeNeighborhoodId }),
      interestIds: user?.interestIds ?? [],
    };
  }

  blockIndexFor(): BlockIndex {
    return buildBlockIndex(this.store.read().blocks);
  }

  ratingSummary(userId: UserId): RatingSummary {
    const { ratings, attendance } = this.store.read();
    const received = ratings.filter((r) => r.subjectId === userId);
    const attended = attendance.filter((a) => a.participantId === userId && a.attended).length;
    const count = received.length;

    return {
      /* null below the threshold, so the UI renders "no ratings yet" rather
       * than a number computed from one opinion (US-53). */
      average:
        count >= NEW_MEMBER_RATING_THRESHOLD
          ? Math.round((received.reduce((sum, r) => sum + r.score, 0) / count) * 10) / 10
          : null,
      count,
      activitiesAttended: attended,
      isNewMember: count < NEW_MEMBER_RATING_THRESHOLD,
    };
  }

  /**
   * For rendering an AUTHOR. Never null — a feed must not crash because one
   * author record is missing or incomplete.
   */
  profileOf(userId: UserId): ProfileView {
    return this.profileOrNull(userId) ?? this.missingProfile(userId);
  }

  /**
   * For `getProfile`. Null means "this person has no public profile" — either
   * they do not exist, or they have not completed setup (BR-U2-32).
   *
   * The two callers are deliberately different functions. Making `getProfile`
   * fall back to the placeholder would publish «—» as a real profile for every
   * abandoned half-registration.
   */
  profileOrNull(userId: UserId): ProfileView | null {
    const user = this.findUser(userId);
    if (!user) return null;

    const venue = this.store.read().venues.find((v) => v.ownerUserId === userId);
    return projectProfile(
      user,
      this.ratingSummary(userId),
      venue?.verificationStatus === 'approved',
    );
  }

  /** A deleted or unknown author still has to render somewhere. US-03
   *  anonymizes rather than deletes, so a hole in the data is a defect — but
   *  it must not crash a feed. */
  private missingProfile(userId: UserId): ProfileView {
    return {
      id: userId,
      displayName: '—',
      interestIds: [],
      rating: { average: null, count: 0, activitiesAttended: 0, isNewMember: true },
      accountType: 'user',
      isVerifiedVenue: false,
      isAnonymized: true,
    };
  }

  /* ------------------------------------------------ the read pipeline */

  /**
   * The normative scoped-read pipeline (business-logic-model.md §2).
   *
   *   load -> filter blocks -> filter query -> rank -> paginate -> project
   *
   * THE ORDER IS CONTRACTUAL, not stylistic:
   *
   *   - blocking runs BEFORE ranking so a blocked author's activity cannot
   *     occupy a page slot or influence the ordering, and so result counts do
   *     not leak that suppressed content exists;
   *   - projection runs LAST because ranking may legitimately read fields the
   *     viewer must never receive. Projecting first would either strip data
   *     the ranker needs or force ranking over already-redacted records.
   *
   * Round 2's server implementation must reproduce this exactly. That
   * equivalence is what lets the same property suite run against both and what
   * makes the mock an oracle model for the real API (PBT-05, P-U1-14).
   */
  readActivities(params: {
    viewerId: UserId | null;
    filters?: ActivityFilters | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    /** Extra restriction applied with the query filters, e.g. "by this author". */
    scope?: (activity: Activity) => boolean;
    /** U3 replaces this with core/rules/ranking. */
    rank?: (activities: Activity[]) => Activity[];
  }): Page<ActivityView> {
    const state = this.store.read();
    const now = this.now();

    // 1. LOAD
    let rows: Activity[] = [...state.activities];

    // 2. FILTER — blocked authors, both directions (INV-1)
    rows = filterVisibleActivities(rows, params.viewerId, this.blockIndexFor());

    // 3. FILTER — scope and query filters
    if (params.scope) rows = rows.filter(params.scope);
    /* U3 — one filter implementation, in core/rules, used by the mock now and
     * by Round 2's server later. A second copy here would drift, and the
     * commutativity property would then be true of one of them. */
    rows = applyActivityFilters(rows, params.filters ?? {}, (a) => deriveState(a, now));

    // 4. RANK
    rows = params.rank ? params.rank(rows) : defaultOrder(rows);

    // 5. PAGINATE — cursor-based (NFR-P4)
    const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
    const start = params.cursor ? rows.findIndex((r) => r.id === params.cursor) + 1 : 0;
    const slice = rows.slice(start, start + limit);
    const nextIndex = start + limit;

    // 6. PROJECT — viewer-scoped views (INV-2, INV-3)
    const items = slice.map((activity) =>
      projectActivity(activity, this.profileOf(activity.authorId), params.viewerId, now, {
        viewerHasRequested: this.hasRequested(params.viewerId, activity.id),
        requestCount: this.requestCount(activity.id),
      }),
    );

    return {
      items,
      nextCursor: nextIndex < rows.length ? (slice[slice.length - 1]?.id ?? null) : null,
      hasMore: nextIndex < rows.length,
    };
  }

  hasRequested(viewerId: UserId | null, activityId: Activity['id']): boolean {
    if (viewerId === null) return false;
    return this.store
      .read()
      .joinRequests.some(
        (r) => r.activityId === activityId && r.requesterId === viewerId && r.status === 'sent',
      );
  }

  requestCount(activityId: Activity['id']): number {
    return this.store.read().joinRequests.filter(
      (r) => r.activityId === activityId && r.status === 'sent',
    ).length;
  }
}

/** Default ordering until U3's ranking module lands: soonest first, with past
 *  activities after upcoming ones so a feed does not open on history. */
function defaultOrder(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime(),
  );
}


