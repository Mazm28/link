import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Activity, ProfileView, UserId } from '@core/domain';
import { projectActivity } from '@core/rules/projection';
import { areaOf, isWithinTehran } from '@core/rules/geo';
import { TEHRAN_NEIGHBORHOODS } from '@core/reference/tehran';
import { arbActivity, arbProfileView, arbUserId } from '@tests/generators/domain';

/* ===========================================================================
 * P-U3-01 — ⚠️ SAFETY-CRITICAL. INV-2 and INV-5.
 *
 * For any activity with `neighborhood` precision and any viewer who is not its
 * author: no `exactAddress`, no `coordinate`, and an `approximateArea` EQUAL to
 * the one derived from its neighborhood alone.
 *
 * The equality clause is the point. A property asserting only "no coordinate
 * key" PASSES against an implementation that jitters the true point — which is
 * precisely the failure INV-5 exists to prevent, because jitter is averaged
 * away by two viewers comparing screens. Asserting the area EQUALS the
 * neighborhood-derived one makes jitter a test failure.
 * =========================================================================== */

const ctx = { viewerHasRequested: false, requestCount: 0 };
const NOW = new Date('2026-08-05T00:00:00.000Z');

function project(activity: Activity, author: ProfileView, viewerId: UserId | null) {
  return projectActivity(activity, author, viewerId, NOW, ctx);
}

describe('P-U3-01 — location precision', () => {
  it('⚠️ withholds address AND coordinate from every non-author viewer', () => {
    fc.assert(
      fc.property(arbActivity, arbProfileView, arbUserId, (base, author, viewerId) => {
        const activity: Activity = { ...base, locationPrecision: 'neighborhood' };
        fc.pre(viewerId !== activity.authorId);

        const view = project(activity, author, viewerId);

        expect(Object.hasOwn(view, 'exactAddress')).toBe(false);
        expect(Object.hasOwn(view, 'coordinate')).toBe(false);
      }),
    );
  });

  it('⚠️ the area is the NEIGHBOURHOOD area — identical for every activity there', () => {
    fc.assert(
      fc.property(
        arbActivity,
        arbActivity,
        arbProfileView,
        arbUserId,
        (a1, a2, author, viewerId) => {
          /* Two DIFFERENT activities — different coordinates, different
           * addresses — in the SAME neighborhood. */
          const first: Activity = { ...a1, locationPrecision: 'neighborhood' };
          const second: Activity = {
            ...a2,
            locationPrecision: 'neighborhood',
            cityId: first.cityId,
            ...(first.neighborhoodId === undefined ? {} : { neighborhoodId: first.neighborhoodId }),
          };
          fc.pre(viewerId !== first.authorId && viewerId !== second.authorId);

          const v1 = project(first, author, viewerId);
          const v2 = project(second, author, viewerId);

          // Indistinguishable. This is what makes jitter impossible to ship.
          expect(v1.approximateArea).toEqual(v2.approximateArea);
          expect(v1.approximateArea).toEqual(areaOf(first.cityId, first.neighborhoodId));
        },
      ),
    );
  });

  it('never carries a coordinate and an area at once', () => {
    fc.assert(
      fc.property(arbActivity, arbProfileView, arbUserId, (activity, author, viewerId) => {
        const view = project(activity, author, viewerId);
        const both = Object.hasOwn(view, 'coordinate') && Object.hasOwn(view, 'approximateArea');
        expect(both).toBe(false);
      }),
    );
  });

  it('the AUTHOR always sees their own address and point', () => {
    fc.assert(
      fc.property(arbActivity, arbProfileView, (base, author) => {
        const activity: Activity = {
          ...base,
          locationPrecision: 'neighborhood',
          exactAddress: 'یوسف‌آباد، خیابان چهلم',
          coordinate: { lat: 35.732, lng: 51.403 },
        };

        const view = project(activity, author, activity.authorId);

        expect(view.exactAddress).toBe('یوسف‌آباد، خیابان چهلم');
        expect(view.coordinate).toEqual({ lat: 35.732, lng: 51.403 });
        expect(Object.hasOwn(view, 'approximateArea')).toBe(false);
      }),
    );
  });

  it('a signed-out viewer gets the most restrictive projection', () => {
    fc.assert(
      fc.property(arbActivity, arbProfileView, (base, author) => {
        /* Even at EXACT precision. BR-U1-71 fails closed for a null viewer, so
         * a future public-preview feature inherits the safe behaviour rather
         * than becoming the widest leak in the product. */
        const activity: Activity = { ...base, locationPrecision: 'exact' };
        const view = project(activity, author, null);

        expect(Object.hasOwn(view, 'exactAddress')).toBe(false);
        expect(Object.hasOwn(view, 'coordinate')).toBe(false);
      }),
    );
  });
});

describe('reference data sanity', () => {
  it('every neighborhood centre falls inside Tehran', () => {
    /* This cannot check that یوسف‌آباد's centre is really in یوسف‌آباد — no test
     * can, for hand-authored geography. It does catch a transposed lat/lng or a
     * dropped digit, which is the realistic error in 77 rows. */
    for (const n of TEHRAN_NEIGHBORHOODS) {
      expect(isWithinTehran(n.center), n.nameFa).toBe(true);
      expect(n.radiusMeters).toBeGreaterThan(300);
      expect(n.radiusMeters).toBeLessThan(3000);
    }
  });

  it('every neighborhood resolves to an area', () => {
    for (const n of TEHRAN_NEIGHBORHOODS) {
      expect(areaOf(n.cityId, n.id)).toEqual({ center: n.center, radiusMeters: n.radiusMeters });
    }
  });
});
