import type { Activity, DerivedActivityState } from '../domain';
import type { ActivityFilters } from '../repositories/types';
import { normalizePersian } from './persianText';

/* ===========================================================================
 * Filters — business-rules.md §7 (BR-U3-70 … 75)
 *
 * AND ACROSS TYPES, OR WITHIN A TYPE (BR-U3-70). Two categories mean "either";
 * a category plus a neighborhood means "both".
 *
 * That shape is what makes commutativity (BR-U3-71, P-U3-04) hold BY
 * CONSTRUCTION rather than by testing: the composed predicate is a conjunction
 * of independent disjunctions, and conjunction does not care about order. The
 * property test then confirms the construction rather than propping it up.
 * =========================================================================== */

type Predicate = (activity: Activity) => boolean;

/** Each entry is one filter TYPE. Absent filters produce no predicate at all,
 *  so an empty filter set is the identity. */
function predicatesFor(filters: ActivityFilters, state: (a: Activity) => DerivedActivityState): Predicate[] {
  const predicates: Predicate[] = [];

  if (filters.cityId !== undefined) {
    const city = filters.cityId;
    /* Direct now. It used to resolve the activity's neighborhood and read the
     * city off that, which broke for the twenty cities that have no
     * neighborhoods at all. */
    predicates.push((a) => a.cityId === city);
  }

  if (filters.categoryIds?.length) {
    const wanted = new Set<string>(filters.categoryIds as readonly string[]);
    predicates.push((a) => a.categoryIds.some((c) => wanted.has(c as string)));
  }

  if (filters.neighborhoodIds?.length) {
    const wanted = new Set<string>(filters.neighborhoodIds as readonly string[]);
    predicates.push(
      (a) => a.neighborhoodId !== undefined && wanted.has(a.neighborhoodId as string),
    );
  }

  if (filters.authorKind !== undefined) {
    const kind = filters.authorKind;
    predicates.push((a) => a.authorKind === kind);
  }

  if (filters.dateFrom !== undefined) {
    const from = filters.dateFrom;
    predicates.push((a) => a.startsAt >= from);
  }

  if (filters.dateTo !== undefined) {
    const to = filters.dateTo;
    predicates.push((a) => a.startsAt <= to);
  }

  if (filters.excludePast === true) {
    predicates.push((a) => state(a) !== 'past');
  }

  if (filters.query !== undefined && filters.query.trim() !== '') {
    /* BR-U3-72 — the query is normalized with the SAME function used on the
     * text, so «يوسف» with an Arabic yeh matches «یوسف‌آباد». Reusing U1's
     * normalizer is what stops a second implementation drifting from the first. */
    const needle = normalizePersian(filters.query);
    predicates.push(
      (a) =>
        normalizePersian(a.title).includes(needle) ||
        normalizePersian(a.description).includes(needle),
    );
  }

  return predicates;
}

export function applyFilters(
  activities: readonly Activity[],
  filters: ActivityFilters,
  state: (a: Activity) => DerivedActivityState,
): Activity[] {
  const predicates = predicatesFor(filters, state);
  return activities.filter((a) => predicates.every((p) => p(a)));
}

/**
 * BR-U3-73 — a title match ranks above a description match.
 *
 * Returns a tier, not an order: ranking still decides within each tier, so
 * search results stay ranked rather than becoming alphabetical by accident.
 */
export function matchTier(
  /* Takes only the two fields it reads, so it works on an Activity and on an
   * ActivityView alike. Widening it to `Activity` would have forced call sites
   * holding a VIEW to fabricate the fields a view deliberately lacks — which
   * is exactly the sort of cast that erodes INV-2 one convenience at a time. */
  activity: { title: string; description: string },
  query: string,
): 0 | 1 | 2 {
  const needle = normalizePersian(query);
  if (needle === '') return 0;
  if (normalizePersian(activity.title).includes(needle)) return 0;
  if (normalizePersian(activity.description).includes(needle)) return 1;
  return 2;
}
