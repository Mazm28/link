import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { deserialize, serialize } from '@infra/mock/LocalStore';
import { arbActivity, arbStore, arbUser } from '@tests/generators/domain';

/* Properties P-U1-12, P-U1-13 — business-logic-model.md §6.4
 * Categories: Round-trip, Invariant. */

/** Walk an object graph and report every path whose key exists but holds
 *  `undefined`, or holds `null` where the source had neither. */
function pathsWithUndefined(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => pathsWithUndefined(v, `${path}[${i}]`));
  }
  const found: string[] = [];
  for (const [key, v] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (v === undefined) found.push(next);
    found.push(...pathsWithUndefined(v, next));
  }
  return found;
}

function keysOf(value: unknown): Set<string> {
  return new Set(
    value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [],
  );
}

describe('LocalStore serialization — properties', () => {
  it('P-U1-12 [Round-trip] parse(serialize(store)) deep-equals store', () => {
    fc.assert(
      fc.property(arbStore, (store) => {
        expect(deserialize(serialize(store))).toEqual(store);
      }),
    );
  });

  it('P-U1-13 [Invariant] a field absent before serialization is absent after', () => {
    /* This property matters far more than it looks.
     *
     * INV-2 requires `exactAddress` to be an ABSENT KEY for a
     * neighborhood-precision activity seen by anyone but its author. A
     * round trip that turned absent -> undefined -> present-with-undefined
     * would silently weaken the location-privacy invariant while every other
     * test in the suite still passed, because `view.exactAddress` would still
     * read as undefined at the call site. The difference only shows up in
     * `'exactAddress' in view`, which is what a future feature would use. */
    fc.assert(
      fc.property(arbActivity, (activity) => {
        const wrapped = deserialize(serialize({ activities: [activity] } as never));
        const roundTripped = (wrapped as unknown as { activities: unknown[] }).activities[0];

        expect(keysOf(roundTripped)).toEqual(keysOf(activity));

        // Specifically: an absent optional stays absent, never becomes null
        // and never becomes a present key holding undefined.
        for (const key of ['exactAddress', 'capacity', 'imageUrl', 'venueId'] as const) {
          expect(key in (roundTripped as object)).toBe(key in activity);
          if (!(key in activity)) {
            expect((roundTripped as Record<string, unknown>)[key]).toBeUndefined();
          }
        }
      }),
    );
  });

  it('P-U1-13b [Invariant] no key anywhere in a round-tripped store holds undefined', () => {
    fc.assert(
      fc.property(arbStore, (store) => {
        expect(pathsWithUndefined(deserialize(serialize(store)))).toEqual([]);
      }),
    );
  });

  it('[Invariant] optional user fields survive absence and presence alike', () => {
    fc.assert(
      fc.property(arbUser, (user) => {
        const wrapped = deserialize(serialize({ users: [user] } as never));
        const back = (wrapped as unknown as { users: Array<typeof user> }).users[0]!;
        for (const key of ['telegramId', 'avatarUrl', 'bio'] as const) {
          expect(key in back).toBe(key in user);
        }
      }),
    );
  });

  it('[Idempotence] serializing a round-tripped store gives identical bytes', () => {
    fc.assert(
      fc.property(arbStore, (store) => {
        const once = serialize(store);
        expect(serialize(deserialize(once))).toBe(once);
      }),
    );
  });
});
