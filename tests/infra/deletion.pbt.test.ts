import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { User, UserId } from '@core/domain';
import { LocalStore } from '@infra/mock/LocalStore';
import { MockContext } from '@infra/mock/repositories/context';
import { createUserRepository } from '@infra/mock/repositories/userRepository';
import { createActivityRepository } from '@infra/mock/repositories/activityRepository';
import { createConnectionRepository } from '@infra/mock/repositories/connectionRepository';
import { arbStore } from '@tests/generators/domain';

/* ===========================================================================
 * P-U2-03 — ANONYMIZATION COMPLETENESS.  ⚠️ Safety-relevant.
 *
 * For any store state and any user u, after deleteAccount(u):
 *   - no personal field of u is reachable through ANY read path, and
 *   - no JoinRequest from u still carries a contact detail.
 *
 * Rules: BR-U2-41, BR-U2-42, BR-U2-46.
 *
 * The read paths below are enumerated from the REPOSITORY INTERFACES rather
 * than from the screens that happen to exist today. That is what makes this a
 * regression test for U3–U6 (PBT-10): when a later unit adds a read path, the
 * property is RE-RUN, not rewritten. A deletion that leaves a contact detail
 * reachable through one forgotten path is exactly the failure this catches,
 * and it is the failure that a hand-written example test would miss, because
 * whoever writes it checks the paths they were already thinking about.
 * =========================================================================== */

/** Everything about a person that must not survive deletion. */
function personalValues(user: User): string[] {
  return [
    user.phone,
    user.telegramId,
    user.displayName,
    user.bio,
    user.avatarId,
  ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');
}

/** Deep scan: any string anywhere in the returned structure. */
function collectStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, into);
  else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
  return into;
}

describe('P-U2-03 — anonymization completeness', () => {
  it('leaves no personal field of a deleted user reachable from any read path', async () => {
    await fc.assert(
      fc.asyncProperty(arbStore, fc.nat(), async (shape, pick) => {
        fc.pre(shape.users.length > 0);

        const target = shape.users[pick % shape.users.length] as User;
        const secrets = personalValues(target);
        fc.pre(secrets.length > 0);

        window.localStorage.clear();
        const store = LocalStore.load(() => structuredClone(shape));
        const ctx = new MockContext(store);
        const users = createUserRepository(ctx);
        const activities = createActivityRepository(ctx);
        const connections = createConnectionRepository(ctx);

        await users.deleteAccount(target.id);

        /* Every viewer, not just a bystander: the deleted user's own id is
         * included because a stale session is the case most likely to still
         * hold a reference. */
        const viewers: (UserId | null)[] = [null, target.id, ...shape.users.map((u) => u.id)];

        const outputs: unknown[] = [];

        for (const viewer of viewers) {
          outputs.push(await users.getProfile(viewer, target.id));
          outputs.push(await activities.listByAuthor(viewer, target.id));
          outputs.push(
            await activities.listFeed({ viewerId: viewer, mode: 'combined', limit: 50 }),
          );
          if (viewer !== null) {
            outputs.push(await connections.listSentRequests(viewer));
            outputs.push(await connections.listIncomingRequests(viewer));
          }
        }

        const seen = collectStrings(outputs);

        for (const secret of secrets) {
          expect(
            seen,
            `a personal value of the deleted user survived in a read path`,
          ).not.toContain(secret);
        }
      }),
      { numRuns: 40 },
    );
  });

  it('revokes every contact detail the deleted user had shared', async () => {
    await fc.assert(
      fc.asyncProperty(arbStore, fc.nat(), async (shape, pick) => {
        fc.pre(shape.users.length > 0);

        const target = shape.users[pick % shape.users.length] as User;
        window.localStorage.clear();
        const store = LocalStore.load(() => structuredClone(shape));
        const ctx = new MockContext(store);

        await createUserRepository(ctx).deleteAccount(target.id);

        for (const request of store.read().joinRequests) {
          if (request.requesterId !== target.id) continue;
          /* Revoked, not rewritten (BR-U2-42): the record that a disclosure
           * happened survives, the disclosed value does not. */
          expect(request.sharedContact).toEqual({ kind: 'none' });
          expect(request.contactRevoked).toBe(true);
        }
      }),
      { numRuns: 40 },
    );
  });
});
