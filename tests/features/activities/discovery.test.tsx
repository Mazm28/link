import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';
import { deriveState } from '@core/rules/activityLifecycle';
import { areaOf } from '@core/rules/geo';
import { cityId } from '@core/domain';

/* ===========================================================================
 * P-U3-05 — ⚠️ precision holds across SEARCH results.
 *
 * P-U3-01 covers the projection. Search is the one path where the text a query
 * MATCHED AGAINST and the text the viewer RECEIVES are different things: a
 * query can match a description the viewer only partially gets. That gap is
 * why this is a separate property rather than a case of the first.
 *
 * Plus the discovery rules from Q6 — past activities have left every discovery
 * surface (BR-U3-40) and survive only on the author's own listing.
 * =========================================================================== */

const TEHRAN = cityId('tehran');

describe('P-U3-05 — search results obey INV-2 and INV-5', () => {
  let repositories: Repositories;

  beforeEach(() => {
    window.localStorage.clear();
    repositories = createMockBackend().repositories;
  });

  it('⚠️ no query ever surfaces a withheld address or coordinate', async () => {
    const viewer = (await repositories.users.getCurrentUser())!;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('کافه', 'بازی', 'کوه', 'شب', 'ی', 'گروه', 'پارک'),
        async (query) => {
          const page = await repositories.activities.listFeed({
            viewerId: viewer.id,
            mode: 'combined',
            limit: 50,
            filters: { cityId: TEHRAN, query, excludePast: true },
          });

          for (const item of page.items) {
            if (item.locationPrecision !== 'neighborhood') continue;
            if (item.author.id === viewer.id) continue;

            expect(Object.hasOwn(item, 'exactAddress')).toBe(false);
            expect(Object.hasOwn(item, 'coordinate')).toBe(false);
            // And the area is the neighborhood's, not a per-activity one.
            expect(item.approximateArea).toEqual(areaOf(item.cityId, item.neighborhoodId));
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe('BR-U3-40 — past activities have left discovery', () => {
  let repositories: Repositories;

  beforeEach(() => {
    window.localStorage.clear();
    repositories = createMockBackend().repositories;
  });

  it('the feed carries none', async () => {
    const viewer = (await repositories.users.getCurrentUser())!;
    const page = await repositories.activities.listFeed({
      viewerId: viewer.id,
      mode: 'combined',
      limit: 100,
      filters: { cityId: TEHRAN, excludePast: true },
    });

    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(item.derivedState).not.toBe('past');
    }
  });

  it("BR-U3-41 — but the author's own listing still has them", async () => {
    const viewer = (await repositories.users.getCurrentUser())!;
    const mine = await repositories.activities.listByAuthor(viewer.id, viewer.id);

    /* CQ4 `A` — this listing is PUBLIC, and US-53's rating summary depends on
     * it. A rating with no visible history behind it is a number with nothing
     * under it, and for someone deciding whether to meet a stranger that
     * history is most of the evidence. */
    const past = mine.filter((a) => a.derivedState === 'past');
    expect(past.length).toBeGreaterThan(0);
  });

  it('U4 can still reach a past activity to hang a rating on', async () => {
    /* BR-U3-43 — recorded as a test so U4 does not discover the gap. Ratings
     * come from activities that already happened; if every route to one were
     * closed, U4's core loop would have nowhere to start. */
    const viewer = (await repositories.users.getCurrentUser())!;
    const mine = await repositories.activities.listByAuthor(viewer.id, viewer.id);
    const past = mine.find((a) => a.derivedState === 'past');

    expect(past).toBeDefined();
    const reachable = await repositories.activities.getActivity(viewer.id, past!.id);
    expect(reachable).not.toBeNull();
  });
});

describe('BR-U3-50 — city scoping', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('a city with no activities returns an empty page rather than everything', async () => {
    const { repositories } = createMockBackend();
    const viewer = (await repositories.users.getCurrentUser())!;

    const page = await repositories.activities.listFeed({
      viewerId: viewer.id,
      mode: 'combined',
      limit: 50,
      filters: { cityId: cityId('shiraz'), excludePast: true },
    });

    /* The honest answer for a city Round 1 has no content for. Falling back to
     * "everything" would silently show Tehran activities to someone who asked
     * for شیراز. */
    expect(page.items).toHaveLength(0);
  });
});

describe('BR-U3-03/04 — date bounds derive from the Tehran day', () => {
  it('deriveState is unchanged by U3', () => {
    const now = new Date('2026-08-05T20:45:00.000Z'); // 00:15 Tehran, next day
    const activity = {
      startsAt: '2026-08-05T19:00:00.000Z',
      status: 'published' as const,
    };
    /* An activity at 22:30 Tehran on the 5th is PAST once Tehran has rolled
     * over, and not before. Comparing against UTC midnight would have got this
     * wrong for three and a half hours every night. */
    expect(deriveState(activity as never, now)).toBe('past');
  });
});
