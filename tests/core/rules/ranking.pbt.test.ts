import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Activity } from '@core/domain';
import { cityId, neighborhoodId } from '@core/domain';
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

describe('⚠️ P-U3-07 — unmeasurable distance is undefined, not far (BR-U3-54)', () => {
  /* A viewer who definitely HAS a Tehran origin, so proximity is live rather
   * than absent for unrelated reasons — otherwise the property would pass
   * vacuously on most runs. */
  const arbTehranViewer: fc.Arbitrary<ViewerContext> = fc.record({
    neighborhoodId: fc.constantFrom('yousefabad', 'vanak', 'tajrish', 'narmak').map(neighborhoodId),
    interestIds: fc.constant([]),
  });

  const OUTSIDER = 'act_outsider' as Activity['id'];

  it('an out-of-city activity ranks the same with or without neighborhood data', () => {
    fc.assert(
      fc.property(arbActivities, arbTehranViewer, arbActivity, (tehran, viewer, outsider) => {
        /* The bug this pins: `neighborhoodDistance` returns FAR both for "6+
         * hops across Tehran" and for "not in this graph at all". Only the
         * first is a distance. Feeding the second into the formula scored a
         * Mashhad activity 0 at FULL weight, while a Yazd activity — same
         * distance from the viewer, i.e. unknown — returned no term at all and
         * had its weight redistributed.
         *
         * So the Yazd activity outranked the Mashhad one because MASHHAD HAS
         * BETTER REFERENCE DATA. Nobody would choose that; it fell out of a
         * sentinel doing two jobs.
         *
         * City scoping used to make this unreachable, which is why BR-U3-53
         * recorded the question as closed. CR-05 unscoped the feed and reopened
         * it on every ranking pass. */
        const withNeighborhood: Activity = {
          ...outsider,
          id: OUTSIDER,
          cityId: cityId('mashhad'),
          neighborhoodId: neighborhoodId('mashhad-01'),
        };

        const withoutNeighborhood: Activity = { ...outsider, id: OUTSIDER, cityId: cityId('yazd') };
        delete withoutNeighborhood.neighborhoodId;

        const positionOf = (activity: Activity) =>
          rankActivities([...tehran, activity], viewer, NOW).findIndex((a) => a.id === OUTSIDER);

        expect(positionOf(withNeighborhood)).toBe(positionOf(withoutNeighborhood));
      }),
    );
  });

  it('a Tehran activity still gets a real proximity term', () => {
    /* The guard against overcorrecting. Dropping the term whenever the graph
     * lookup is awkward would satisfy the property above and destroy US-21. */
    const near: Activity = {
      ...({} as Activity),
      id: 'act_near' as Activity['id'],
      authorId: 'usr_a' as Activity['authorId'],
      authorKind: 'user',
      title: 'نزدیک',
      description: 'یک فعالیت نزدیک',
      categoryIds: [],
      startsAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
      cityId: cityId('tehran'),
      neighborhoodId: neighborhoodId('yousefabad'),
      locationPrecision: 'neighborhood',
      status: 'published',
      promotion: { sponsored: false },
      createdAt: NOW.toISOString(),
    };

    const far: Activity = {
      ...near,
      id: 'act_far' as Activity['id'],
      neighborhoodId: neighborhoodId('shahr-rey'),
    };

    const viewer: ViewerContext = {
      neighborhoodId: neighborhoodId('yousefabad'),
      interestIds: [],
    };

    /* Same startsAt, same everything but location — so if proximity were being
     * dropped, the tie-break on id would put act_far first. It must not. */
    expect(rankActivities([far, near], viewer, NOW).map((a) => a.id)).toEqual([near.id, far.id]);
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
