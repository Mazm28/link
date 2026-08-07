import { beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createMockBackend } from '@infra/mock';
import { ActivityIdCodec, UserIdCodec, type ActivityId, type UserId } from '@core/domain';
import type { Repositories } from '@core/repositories';

/* Property P-U1-14 — business-logic-model.md §6.5
 * Categories: Oracle / model-based (PBT-05), Stateful (PBT-06).
 *
 * This is the property that makes the mock an ORACLE FOR ROUND 2. The same
 * suite, pointed at `infra/http`, verifies that the real backend upholds the
 * identical contract — including the read-pipeline ordering, which is why that
 * ordering is specified as normative rather than left to each implementation.
 *
 * The model below is a deliberately naive reimplementation of the acceptance
 * rules. Its value comes from being independent: if both it and the repository
 * were derived from the same code, agreement would prove nothing. */

const A = (n: string): ActivityId => ActivityIdCodec.slug(n);
const U = (n: string): UserId => UserIdCodec.slug(n);

const USER_NS = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;
const ACTIVITY_NS = ['01', '02', '03', '04', '05', '06'] as const;

type Op =
  | { t: 'block'; a: string; b: string }
  | { t: 'unblock'; a: string; b: string }
  | { t: 'request'; activity: string; requester: string; contact: 'none' | 'phone' | 'telegram' }
  | { t: 'withdrawAll'; requester: string };

const arbOp: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    t: fc.constant('block' as const),
    a: fc.constantFrom(...USER_NS),
    b: fc.constantFrom(...USER_NS),
  }),
  fc.record({
    t: fc.constant('unblock' as const),
    a: fc.constantFrom(...USER_NS),
    b: fc.constantFrom(...USER_NS),
  }),
  fc.record({
    t: fc.constant('request' as const),
    activity: fc.constantFrom(...ACTIVITY_NS),
    requester: fc.constantFrom(...USER_NS),
    contact: fc.constantFrom('none' as const, 'phone' as const, 'telegram' as const),
  }),
  fc.record({
    t: fc.constant('withdrawAll' as const),
    requester: fc.constantFrom(...USER_NS),
  }),
);

/**
 * The reference model.
 *
 * Everything is keyed by the FULL id (`usr_01`, `act_01`), matching what the
 * repository stores. An earlier version of this model mixed bare ordinals with
 * full ids and reported a false failure — worth recording, because a model that
 * disagrees with reality for its own reasons is worse than no model at all.
 *
 * Blocks are stored DIRECTIONALLY, exactly as the repository stores them, and
 * queried in both directions — mirroring `buildBlockIndex`. Modelling them as
 * an unordered pair would have hidden the fact that `unblockUser` removes only
 * the row it was given.
 */
class Model {
  private readonly directedBlocks = new Set<string>();
  /** activityId -> set of userIds with a live (status 'sent') request */
  readonly liveRequests = new Map<string, Set<string>>();

  private key(a: string, b: string) {
    return `${a}->${b}`;
  }

  isBlocked(a: string, b: string) {
    return this.directedBlocks.has(this.key(a, b)) || this.directedBlocks.has(this.key(b, a));
  }

  block(a: string, b: string) {
    if (a === b) return;
    // The repository refuses to add a second row for a pair already blocked in
    // either direction, so the model must not add one either.
    if (this.isBlocked(a, b)) return;
    this.directedBlocks.add(this.key(a, b));
  }

  unblock(a: string, b: string) {
    this.directedBlocks.delete(this.key(a, b));
  }

  request(activityId: string, requesterId: string, accepted: boolean) {
    if (!accepted) return;
    const set = this.liveRequests.get(activityId) ?? new Set<string>();
    set.add(requesterId);
    this.liveRequests.set(activityId, set);
  }

  withdrawAll(requesterId: string) {
    for (const set of this.liveRequests.values()) set.delete(requesterId);
  }

  live(activityId: string): Set<string> {
    return this.liveRequests.get(activityId) ?? new Set<string>();
  }
}

describe('mock repositories — oracle and invariant properties', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('P-U1-14 [Oracle/Stateful] a random command sequence leaves state matching the model', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbOp, { minLength: 1, maxLength: 25 }), async (ops) => {
        window.localStorage.clear();
        const backend = createMockBackend();
        const repos: Repositories = backend.repositories;
        const model = new Model();

        // Authors and telegram availability, read once from the seed so the
        // model does not depend on the repository to decide acceptance.
        const state = backend.store.read();
        const authorOf = new Map(state.activities.map((a) => [String(a.id), String(a.authorId)]));
        const hasTelegram = new Set(
          state.users.filter((u) => u.telegramId !== undefined).map((u) => String(u.id)),
        );

        // The model must START from the seeded state, or every comparison is
        // off by whatever the seed already contains.
        for (const b of state.blocks) model.block(String(b.blockerId), String(b.blockedId));
        for (const r of state.joinRequests) {
          if (r.status === 'sent') model.request(String(r.activityId), String(r.requesterId), true);
        }

        for (const op of ops) {
          switch (op.t) {
            case 'block': {
              if (op.a === op.b) break;
              await repos.safety.blockUser(U(op.a), U(op.b));
              model.block(`usr_${op.a}`, `usr_${op.b}`);
              break;
            }
            case 'unblock': {
              await repos.safety.unblockUser(U(op.a), U(op.b));
              // The repository deletes only the row in that direction, so a
              // pair blocked the other way round stays blocked. The model
              // mirrors that rather than clearing the pair.
              model.unblock(`usr_${op.a}`, `usr_${op.b}`);
              break;
            }
            case 'request': {
              const activityId = `act_${op.activity}`;
              const requesterId = `usr_${op.requester}`;
              const author = authorOf.get(activityId) ?? '';

              const wouldAccept =
                author !== requesterId &&
                !model.isBlocked(requesterId, author) &&
                (op.contact !== 'telegram' || hasTelegram.has(requesterId));

              let accepted = false;
              try {
                await repos.connections.sendJoinRequest({
                  requesterId: U(op.requester),
                  activityId: A(op.activity),
                  sharedContact:
                    op.contact === 'none'
                      ? { kind: 'none' }
                      : op.contact === 'phone'
                        ? { kind: 'phone', value: 'x' }
                        : { kind: 'telegram', value: 'x' },
                });
                accepted = true;
              } catch {
                accepted = false;
              }

              // The model and the repository must agree on WHETHER the write
              // was allowed — that is the contract Round 2 has to reproduce.
              expect(accepted).toBe(wouldAccept);
              model.request(activityId, requesterId, accepted);
              break;
            }
            case 'withdrawAll': {
              const sent = await repos.connections.listSentRequests(U(op.requester));
              for (const r of sent) {
                if (r.status === 'sent') {
                  await repos.connections.withdrawRequest(U(op.requester), r.id);
                }
              }
              model.withdrawAll(`usr_${op.requester}`);
              break;
            }
          }
        }

        /* ---- observable state must agree with the model ----
         *
         * Compared as SETS of live requesters per activity, not as counts: two
         * different sets can have the same size, and a contract that only
         * guaranteed counts would let Round 2's server return the wrong people. */
        for (const n of ACTIVITY_NS) {
          const activityId = `act_${n}`;
          const author = authorOf.get(activityId);
          if (author === undefined) continue;

          const actual = await repos.connections.listRequestsForActivity(
            author as UserId,
            A(n),
          );
          const actualLive = new Set(
            actual.filter((r) => r.status === 'sent').map((r) => String(r.requester.id)),
          );

          expect([...actualLive].sort()).toEqual([...model.live(activityId)].sort());
        }
      }),
      { numRuns: 30 },
    );
  });

  it('INV-1 [Invariant] no feed ever returns an activity by a blocked author', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.constantFrom(...USER_NS), { minLength: 1, maxLength: 4 }),
        async (blockedNs) => {
          window.localStorage.clear();
          const backend = createMockBackend();
          const viewer = U('01');

          for (const n of blockedNs) {
            if (`usr_${n}` === String(viewer)) continue;
            await backend.repositories.safety.blockUser(viewer, U(n));
          }

          const blocked = new Set(
            blockedNs.filter((n) => `usr_${n}` !== String(viewer)).map((n) => `usr_${n}`),
          );

          const page = await backend.repositories.activities.listFeed({
            viewerId: viewer,
            mode: 'combined',
            limit: 100,
          });

          for (const item of page.items) {
            expect(blocked.has(String(item.author.id))).toBe(false);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('INV-2 [Invariant] exactAddress is ABSENT for neighborhood precision, for any non-author viewer', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...USER_NS), async (viewerN) => {
        window.localStorage.clear();
        const backend = createMockBackend();
        const viewer = U(viewerN);

        const page = await backend.repositories.activities.listFeed({
          viewerId: viewer,
          mode: 'combined',
          limit: 100,
        });

        for (const item of page.items) {
          if (item.locationPrecision === 'neighborhood' && item.author.id !== viewer) {
            // ABSENT, not empty, not null. `in` is the check that matters —
            // reading the property would pass even if the key were present
            // holding undefined, which is exactly the weakening P-U1-13 guards.
            expect('exactAddress' in item).toBe(false);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('INV-2b [Invariant] the author always sees their own withheld address', async () => {
    window.localStorage.clear();
    const backend = createMockBackend();
    // act_02 is neighborhood-precision and DOES carry a stored address —
    // storage is not disclosure, and the author must still see it.
    const asAuthor = await backend.repositories.activities.getActivity(U('02'), A('02'));
    expect(asAuthor?.locationPrecision).toBe('neighborhood');
    expect('exactAddress' in (asAuthor ?? {})).toBe(true);

    const asStranger = await backend.repositories.activities.getActivity(U('03'), A('02'));
    expect('exactAddress' in (asStranger ?? {})).toBe(false);
  });

  it('INV-3 [Invariant] no ProfileView anywhere carries contact details', async () => {
    window.localStorage.clear();
    const backend = createMockBackend();

    const page = await backend.repositories.activities.listFeed({
      viewerId: U('01'),
      mode: 'combined',
      limit: 100,
    });

    for (const item of page.items) {
      expect('phone' in item.author).toBe(false);
      expect('telegramId' in item.author).toBe(false);
    }
  });

  it('INV-3b [Invariant] a non-poster gets no contact details from an inbox read', async () => {
    window.localStorage.clear();
    const backend = createMockBackend();

    // act_01 belongs to usr_01. Anyone else asking gets an empty list, not a
    // redacted one — there is nothing to redact if nothing is returned.
    const asPoster = await backend.repositories.connections.listRequestsForActivity(
      U('01'),
      A('01'),
    );
    expect(asPoster.length).toBeGreaterThan(0);

    const asStranger = await backend.repositories.connections.listRequestsForActivity(
      U('03'),
      A('01'),
    );
    expect(asStranger).toEqual([]);
  });

  it('INV-4 [Invariant] a null viewer receives the most restrictive projection (BR-U1-71)', async () => {
    window.localStorage.clear();
    const backend = createMockBackend();

    const page = await backend.repositories.activities.listFeed({
      viewerId: null,
      mode: 'combined',
      limit: 100,
    });

    // Signed-out browsing is out of scope for Round 1. Defining the null case
    // now stops a future "public preview" from becoming the widest data leak
    // in the product.
    for (const item of page.items) {
      expect('exactAddress' in item).toBe(false);
      expect(item.viewerHasRequested).toBe(false);
    }
  });
});
