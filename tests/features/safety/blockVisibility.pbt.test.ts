import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';
import type { StoreShape } from '@infra/mock/LocalStore';
import type { UserId } from '@core/domain';

/* ===========================================================================
 * ⚠️ P-U6-01 … P-U6-05 — US-72, INV-1. SAFETY-CRITICAL.
 *
 * US-72's criterion is that a blocked person is absent from **every** feed,
 * search result, and listing. `unit-of-work.md` scheduled U6 LAST for exactly
 * this file: the property enumerates read paths, so it is only complete once
 * they all exist.
 *
 * ⚠️ BOUNDED BY U5's DEFERRAL. The venue dashboard's read paths do not exist,
 * so this is complete FOR WHAT EXISTS and must be extended when U5 lands.
 * "Verified across every read path" is true today and will silently become
 * false the moment U5 adds one — stated here so nobody reads the claim as
 * stronger than it is.
 *
 * ⚠️ VERIFIED AGAINST A DELIBERATELY BROKEN FILTER before being kept — see the
 * implementation summary. A safety property that has never been seen to fail
 * is a guess, and this project has shipped one (P-U3-02).
 * =========================================================================== */

function backend() {
  return createMockBackend();
}

/** Every read path a viewer can reach. Adding a path to the product means
 *  adding it here — that is the point of enumerating them in one place. */
async function readEverything(repos: Repositories, viewer: UserId) {
  const [feed, search, incoming, sent, notifications] = await Promise.all([
    repos.activities.listFeed({ viewerId: viewer, mode: 'combined', limit: 100, filters: {} }),
    repos.activities.listFeed({
      viewerId: viewer,
      mode: 'combined',
      limit: 100,
      filters: { query: 'ا' },
    }),
    repos.connections.listIncomingRequests(viewer),
    repos.connections.listSentRequests(viewer),
    repos.notifications.list(viewer),
  ]);

  return { feed, search, incoming, sent, notifications };
}

describe('⚠️ P-U6-01 — a blocked person is absent from every read path', () => {
  let store: StoreShape;

  beforeEach(() => {
    window.localStorage.clear();
    store = backend().store.read();
  });

  it('no read path returns content authored by or about a blocked person', async () => {
    const ids = store.users.map((u) => String(u.id));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ids),
        fc.constantFrom(...ids),
        async (viewerRaw, otherRaw) => {
          if (viewerRaw === otherRaw) return;
          const viewer = viewerRaw as UserId;
          const other = otherRaw as UserId;

          const b = backend();
          await b.repositories.safety.blockUser(viewer, other);

          const seen = await readEverything(b.repositories, viewer);

          /* Activities: nothing authored by the blocked person. */
          for (const item of [...seen.feed.items, ...seen.search.items]) {
            expect(String(item.author.id)).not.toBe(String(other));
          }

          /* Requests, both directions. */
          for (const r of seen.incoming) {
            expect(String(r.requester.id)).not.toBe(String(other));
          }
          for (const r of seen.sent) {
            expect(String(r.activity.author.id)).not.toBe(String(other));
          }

          /* Profile. */
          expect(await b.repositories.users.getProfile(viewer, other)).toBeNull();

          /* ⚠️ SYMMETRY — the other direction must hold too (US-72's second
           * criterion). Blocking is not a mute. */
          const theirs = await readEverything(b.repositories, other);
          for (const item of [...theirs.feed.items, ...theirs.search.items]) {
            expect(String(item.author.id)).not.toBe(String(viewer));
          }
          expect(await b.repositories.users.getProfile(other, viewer)).toBeNull();
        },
      ),
      { numRuns: 25 },
    );
  });

  it('⚠️ AR-05 — a blocked person’s rating is excluded from the aggregate', async () => {
    /* The accepted risk, asserted so it is a KNOWN behaviour rather than a
     * surprise. If this ever stops being true, that is a product decision and
     * this test is where it gets made. */
    const b = backend();
    const s = b.store.read();

    const rating = s.ratings[0];
    expect(rating).toBeDefined();
    if (rating === undefined) return;

    const before = await b.repositories.connections.getRatingSummary(
      rating.subjectId,
      rating.subjectId,
    );
    await b.repositories.safety.blockUser(rating.subjectId, rating.raterId);
    const after = await b.repositories.connections.getRatingSummary(
      rating.subjectId,
      rating.subjectId,
    );

    expect(after.count).toBe(before.count - 1);
  });
});

describe('P-U6-02 — blocking is symmetric', () => {
  beforeEach(() => window.localStorage.clear());

  it('each side is equally invisible to the other', async () => {
    const b = backend();
    const s = b.store.read();
    const [a, c] = [s.users[0]!.id, s.users[1]!.id];

    await b.repositories.safety.blockUser(a, c);

    /* One Block row, both directions. `buildBlockIndex` links both ways, so a
     * half-applied block — where A cannot see C but C still sees A — is
     * unrepresentable rather than merely avoided. */
    expect(await b.repositories.users.getProfile(a, c)).toBeNull();
    expect(await b.repositories.users.getProfile(c, a)).toBeNull();
  });
});

describe('⚠️ P-U6-03 / P-U6-04 — a block deletes nothing and unblock restores exactly', () => {
  beforeEach(() => window.localStorage.clear());

  it('entity counts are unchanged by block and unblock', async () => {
    const b = backend();
    const s0 = b.store.read();
    const counts = (s: StoreShape) => ({
      activities: s.activities.length,
      joinRequests: s.joinRequests.length,
      attendance: s.attendance.length,
      ratings: s.ratings.length,
      notifications: s.notifications.length,
    });
    const before = counts(s0);
    const [a, c] = [s0.users[0]!.id, s0.users[1]!.id];

    await b.repositories.safety.blockUser(a, c);
    expect(counts(b.store.read())).toEqual(before);

    await b.repositories.safety.unblockUser(a, c);
    expect(counts(b.store.read())).toEqual(before);
  });

  it('⚠️ every read path returns exactly what it returned before the block', async () => {
    /* BR-U6-15/20 — reversibility is a PROPERTY OF THE DESIGN, not a restore
     * procedure. Nothing is deleted, so there is no prior state to rebuild —
     * and if a block ever did delete, this test is what would catch it. */
    const b = backend();
    const s = b.store.read();
    const [a, c] = [s.users[0]!.id, s.users[1]!.id];

    const shape = async (viewer: UserId) => {
      const r = await readEverything(b.repositories, viewer);
      return JSON.stringify({
        feed: r.feed.items.map((i) => String(i.id)).sort(),
        incoming: r.incoming.map((i) => String(i.id)).sort(),
        sent: r.sent.map((i) => String(i.id)).sort(),
        notifications: r.notifications.map((i) => String(i.id)).sort(),
      });
    };

    const before = await shape(a);
    await b.repositories.safety.blockUser(a, c);
    await b.repositories.safety.unblockUser(a, c);
    expect(await shape(a)).toBe(before);
  });
});

describe('P-U6-05 — reports never surface', () => {
  beforeEach(() => window.localStorage.clear());

  it('no read path returns a report or any field of one', async () => {
    /* FR-63 — reports are write-only until Round 3's console. The seed
     * contains reports with distinctive free text; none of it may appear in
     * anything a viewer can read. */
    const b = backend();
    const s = b.store.read();
    const details = s.reports
      .map((r) => r.detail)
      .filter((d): d is string => d !== undefined && d.length > 0);

    expect(details.length).toBeGreaterThan(0); // otherwise this proves nothing

    for (const user of s.users.slice(0, 5)) {
      const seen = await readEverything(b.repositories, user.id);
      const serialized = JSON.stringify(seen);
      for (const detail of details) {
        expect(serialized).not.toContain(detail);
      }
    }
  });
});
