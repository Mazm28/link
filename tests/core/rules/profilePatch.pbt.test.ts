import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildProfilePatch } from '@core/rules/profileValidation';
import { draftFrom } from '@features/identity/profileDraft';
import { arbUser } from '@tests/generators/domain';

/* ===========================================================================
 * P-U2-02 — patch semantics.
 *
 * An ABSENT key leaves its field untouched; a PRESENT key always writes.
 *
 * This is the property that makes `exactOptionalPropertyTypes` a guarantee
 * rather than a claim: the compiler keeps "absent" and "present but undefined"
 * apart as TYPES, and this checks the runtime actually honours the
 * distinction.
 * =========================================================================== */

describe('P-U2-02 — buildProfilePatch', () => {
  it('produces an EMPTY patch when nothing changed', () => {
    fc.assert(
      fc.property(arbUser, (user) => {
        const patch = buildProfilePatch(user, draftFrom(user));
        expect(Object.keys(patch)).toHaveLength(0);
      }),
    );
  });

  it('includes a key if and only if that field changed', () => {
    fc.assert(
      fc.property(arbUser, fc.string({ minLength: 2, maxLength: 30 }), (user, newName) => {
        const draft = { ...draftFrom(user), displayName: newName };
        const patch = buildProfilePatch(user, draft);

        const changed = newName.replace(/\s+/g, ' ').trim() !== (user.displayName ?? '');

        expect(Object.hasOwn(patch, 'displayName')).toBe(changed);
        /* No other field may appear. A patch that quietly carries an unchanged
         * field works against a mock and then overwrites whatever a second
         * device changed, the moment there is a real backend. */
        expect(Object.keys(patch).filter((k) => k !== 'displayName')).toHaveLength(0);
      }),
    );
  });

  it('never emits a key whose value is undefined', () => {
    fc.assert(
      fc.property(arbUser, arbUser, (user, other) => {
        const draft = draftFrom(other);
        const patch = buildProfilePatch(user, draft);

        for (const [key, value] of Object.entries(patch)) {
          expect(value, `${key} was present but undefined`).not.toBeUndefined();
        }
      }),
    );
  });

  it('treats interest reordering as no change', () => {
    fc.assert(
      fc.property(arbUser, (user) => {
        const reversed = [...user.interestIds].reverse();
        const patch = buildProfilePatch(user, { ...draftFrom(user), interestIds: reversed });
        expect(Object.hasOwn(patch, 'interestIds')).toBe(false);
      }),
    );
  });
});
