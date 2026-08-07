import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Activity } from '@core/domain';
import { neighborhoodId } from '@core/domain';
import { rankActivities, type ViewerContext } from '@core/rules/ranking';
import { applyFilters } from '@core/rules/filters';
import { arbActivity } from '@tests/generators/domain';

/* ===========================================================================
 * P-U3-02, P-U3-03, P-U3-06 — ranking.
 * P-U3-04 — filter commutativity.
 * =========================================================================== */

const NOW = new Date('2026-08-05T00:00:00.000Z');

const arbViewer: fc.Arbitrary<ViewerContext> = fc.record({
  neighborhoodId: fc.option(
    fc.constantFrom('yousefabad', 'vanak', 'tajrish', 'narmak').map(neighborhoodId),
    { nil: undefined },
  ),
  interestIds: fc.constant([]),
});

const arbActivities = fc.array(arbActivity, { minLength: 1, maxLength: 12 });

describe('P-U3-02 — ranking preserves the set', () => {
  it('returns exactly the input activities, none added, none dropped', () => {
    fc.assert(
      fc.property(arbActivities, arbViewer, (activities, viewer) => {
        const ranked = rankActivities(activities, viewer, NOW);

        expect(ranked).toHaveLength(activities.length);

        /* Compare as MULTISETS. `[...].sort()` on objects stringifies every
         * element to "[object Object]", so it compares nothing — and the
         * generator happily produces two activities sharing an id, which is
         * how that mistake surfaced. Sorting serialized elements is the
         * comparison the property actually means. */
        const key = (a: Activity) => JSON.stringify(a);
        expect([...ranked].map(key).sort()).toEqual([...activities].map(key).sort());
      }),
    );
  });
});

describe('P-U3-03 — ranking is deterministic and total', () => {
  it('gives the same order for the same input', () => {
    fc.assert(
      fc.property(arbActivities, arbViewer, (activities, viewer) => {
        const first = rankActivities(activities, viewer, NOW).map((a) => a.id);
        const second = rankActivities(activities, viewer, NOW).map((a) => a.id);
        expect(first).toEqual(second);
      }),
    );
  });

  it('does not depend on the order it was given', () => {
    fc.assert(
      fc.property(arbActivities, arbViewer, (activities, viewer) => {
        /* Ties break by startsAt then id, never by input order — otherwise the
         * Round-2 oracle test would flap whenever the server returned rows in
         * a different order, for reasons having nothing to do with ranking. */
        const forward = rankActivities(activities, viewer, NOW).map((a) => a.id);
        const backward = rankActivities([...activities].reverse(), viewer, NOW).map((a) => a.id);
        expect(forward).toEqual(backward);
      }),
    );
  });
});

describe('P-U3-06 — ranking leaks no withheld field', () => {
  it('order is unchanged when only a withheld field differs', () => {
    fc.assert(
      fc.property(arbActivities, arbViewer, (activities, viewer) => {
        /* The read pipeline ranks BEFORE projecting, deliberately, so ranking
         * may legitimately read fields the viewer will never receive. This is
         * the only check that the freedom is not used to smuggle ordering
         * information out: vary exactly those fields, and the order must not
         * move. */
        const withSecrets: Activity[] = activities.map((a, i) => ({
          ...a,
          exactAddress: `خیابان شماره ${i}`,
          coordinate: { lat: 35.7 + i / 1000, lng: 51.4 + i / 1000 },
        }));

        const withoutSecrets: Activity[] = activities.map((a) => {
          const copy = { ...a };
          delete copy.exactAddress;
          delete copy.coordinate;
          return copy;
        });

        const a = rankActivities(withSecrets, viewer, NOW).map((x) => x.id);
        const b = rankActivities(withoutSecrets, viewer, NOW).map((x) => x.id);
        expect(a).toEqual(b);
      }),
    );
  });
});

describe('P-U3-04 — filter composition is commutative', () => {
  const state = () => 'upcoming' as const;

  it('the same filters in any order give the same set', () => {
    fc.assert(
      fc.property(
        arbActivities,
        fc.constantFrom('user' as const, 'venue' as const),
        fc.string({ maxLength: 6 }),
        (activities, authorKind, query) => {
          /* AND across types, OR within one — a conjunction of independent
           * disjunctions, which does not care about order. The property
           * confirms the construction rather than propping it up. */
          const both = applyFilters(activities, { authorKind, query }, state);

          const stepwise = applyFilters(
            applyFilters(activities, { query }, state),
            { authorKind },
            state,
          );

          expect(both.map((a) => a.id)).toEqual(stepwise.map((a) => a.id));
        },
      ),
    );
  });

  it('an empty filter set is the identity', () => {
    fc.assert(
      fc.property(arbActivities, (activities) => {
        expect(applyFilters(activities, {}, state)).toEqual([...activities]);
      }),
    );
  });
});
