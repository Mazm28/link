import type {
  Activity,
  CategoryId,
  InterestTagId,
  NeighborhoodId,
} from '../domain';
import { buildGraph, neighborhoodDistance } from './neighborhood';
import { TEHRAN_NEIGHBORHOODS } from '../reference/tehran';

/* Built once. The graph is static reference data, and rebuilding it per call
 * would make ranking O(n) in the dataset for every activity scored. */
const GRAPH = buildGraph(TEHRAN_NEIGHBORHOODS);

/* ===========================================================================
 * Ranking — business-rules.md §6 (BR-U3-60 … 67), FR-27
 *
 * THE RECOMMENDATION-ENGINE SEAM. Pure: it takes a viewer context and a list,
 * and returns an order. No repository, no clock beyond the `now` it is given,
 * no I/O. Round 2 replaces the scoring without touching a caller, which is
 * what FR-27 asks for — and a seam that has never been exercised is a guess,
 * so it is exercised here rather than stubbed.
 * =========================================================================== */

export type FeedMode = 'combined' | 'neighborhood' | 'interest';

export interface ViewerContext {
  /** Absent for accounts created after CR-02 made location optional. */
  neighborhoodId?: NeighborhoodId | undefined;
  /** Empty for accounts created after CR-02 made interests optional. */
  interestIds: readonly InterestTagId[];
}

/**
 * BR-U3-60 — weights are DATA, not code.
 *
 * Tuning ranking should not be a code change, and a table is reviewable in a
 * way a scattering of magic numbers is not.
 */
export const WEIGHTS = { proximity: 0.45, interest: 0.35, recency: 0.2 } as const;

/** The horizon over which `recency` decays — the same 2-month cap activities
 *  are validated against (BR-U3-04), so the newest activity scores ~1 and one
 *  at the far edge scores ~0. */
const HORIZON_MS = 60 * 24 * 60 * 60 * 1000;

/** Beyond this many hops, proximity is 0. Tehran's graph is ~8 hops across, so
 *  6 keeps the far side of the city from all scoring identically. */
const MAX_HOPS = 6;

interface Term {
  value: number;
  weight: number;
}

function proximityTerm(viewer: ViewerContext, activity: Activity): Term | null {
  /* BR-U3-61 — a MISSING input yields no term at all, rather than a zero score.
   * The difference matters: a zero would drag every activity down equally and
   * still consume its weight; an absent term is removed and its weight
   * redistributed, so the remaining signals decide the order.
   *
   * This is why the weighted form was chosen over a tiered one. After CR-02
   * made interests and location optional, "some inputs missing" is the NORMAL
   * case, and a tiered ranking would need an explicit branch per combination. */
  if (viewer.neighborhoodId === undefined) return null;
  /* An activity in a city with no neighborhoods has nothing to measure from,
   * so it contributes no proximity term rather than a worst-case one. */
  if (activity.neighborhoodId === undefined) return null;

  const hops = neighborhoodDistance(viewer.neighborhoodId, activity.neighborhoodId, GRAPH);

  return { value: Math.max(0, 1 - hops / MAX_HOPS), weight: WEIGHTS.proximity };
}

function interestTerm(viewer: ViewerContext, activity: Activity): Term | null {
  if (viewer.interestIds.length === 0) return null;

  const wanted = new Set<string>(viewer.interestIds as readonly string[]);
  const overlap = activity.categoryIds.filter((c: CategoryId) => wanted.has(c as string)).length;

  return { value: overlap / viewer.interestIds.length, weight: WEIGHTS.interest };
}

function recencyTerm(activity: Activity, now: Date): Term {
  const delta = new Date(activity.startsAt).getTime() - now.getTime();
  /* Sooner scores higher. Anything already past scores 0 — it should not be in
   * a discovery list at all (BR-U3-40), and this makes a leak score last
   * rather than first. */
  const value = delta <= 0 ? 0 : Math.max(0, 1 - delta / HORIZON_MS);
  return { value, weight: WEIGHTS.recency };
}

/**
 * BR-U3-60/61 — the combined score, with missing terms dropped and the
 * remaining weights renormalized.
 *
 * With every term missing the score is 0 for everything, and the tie-break in
 * `rankActivities` produces a chronological order — which is the honest answer
 * for a viewer the system knows nothing about.
 */
export function scoreActivity(
  activity: Activity,
  viewer: ViewerContext,
  now: Date,
  mode: FeedMode = 'combined',
): number {
  const terms: (Term | null)[] =
    mode === 'neighborhood'
      ? [proximityTerm(viewer, activity)]
      : mode === 'interest'
        ? [interestTerm(viewer, activity)]
        : [proximityTerm(viewer, activity), interestTerm(viewer, activity), recencyTerm(activity, now)];

  const present = terms.filter((t): t is Term => t !== null);
  if (present.length === 0) return 0;

  const totalWeight = present.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight === 0) return 0;

  return present.reduce((sum, t) => sum + t.value * t.weight, 0) / totalWeight;
}

/**
 * BR-U3-62/63 — set-preserving, deterministic, and total.
 *
 * Returns a NEW array holding exactly the input elements. Ties break by
 * `startsAt`, then by `id` — never by input order, which is not stable across
 * a repository swap and would make the Round-2 oracle test flap for reasons
 * that have nothing to do with ranking.
 */
export function rankActivities(
  activities: readonly Activity[],
  viewer: ViewerContext,
  now: Date,
  mode: FeedMode = 'combined',
): Activity[] {
  const scored = activities.map((activity) => ({
    activity,
    score: scoreActivity(activity, viewer, now, mode),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const byDate = a.activity.startsAt.localeCompare(b.activity.startsAt);
    if (byDate !== 0) return byDate;
    return (a.activity.id as string).localeCompare(b.activity.id as string);
  });

  return scored.map((s) => s.activity);
}

/**
 * BR-U3-64/65 — can this mode actually work for this viewer?
 *
 * After CR-02 this is the common question, not an edge case: profiles no
 * longer collect a neighborhood, and interests are optional. The caller shows
 * combined results and SAYS SO rather than silently substituting them — a feed
 * that quietly changes what it ranks by is one the user cannot reason about.
 */
export function modeIsAvailable(mode: FeedMode, viewer: ViewerContext): boolean {
  if (mode === 'neighborhood') return viewer.neighborhoodId !== undefined;
  if (mode === 'interest') return viewer.interestIds.length > 0;
  return true;
}

export function effectiveMode(mode: FeedMode, viewer: ViewerContext): FeedMode {
  return modeIsAvailable(mode, viewer) ? mode : 'combined';
}
