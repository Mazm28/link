import { beforeEach, describe, expect, it } from 'vitest';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';
import { RefusalError } from '@core/errors';
import { RESERVED_FAILURE_CODE } from '@core/rules/otp';

/* US-01 — the mocked sign-in flow, business-logic-model.md §2. */

describe('authRepository', () => {
  let repositories: Repositories;

  beforeEach(() => {
    window.localStorage.clear();
    repositories = createMockBackend().repositories;
  });

  it('BR-U2-11 — returns an IDENTICAL response for a known and an unknown number', async () => {
    const known = await repositories.auth.requestCode('+989121004321');
    const unknown = await repositories.auth.requestCode('+989350000000');

    /* The account-enumeration control. If these ever differ — in shape, in
     * fields, in anything a caller can branch on — a screen can leak whether
     * a number is registered. */
    expect(known).toEqual(unknown);
  });

  it('rejects a malformed number before anything else happens', async () => {
    await expect(repositories.auth.requestCode('0912')).rejects.toBeInstanceOf(RefusalError);
  });

  it('BR-U2-13 — an unknown number signs in and creates an INCOMPLETE account', async () => {
    const session = await repositories.auth.verifyCode('09350000000', '12345');
    expect(session.userId).toBeTruthy();

    const user = await repositories.users.getCurrentUser();
    expect(user?.phone).toBe('+989350000000');

    /* No name, no neighborhood, not complete — so the account has no public
     * presence at all until setup finishes (BR-U2-32). */
    expect(user?.displayName).toBeUndefined();
    expect(user?.homeNeighborhoodId).toBeUndefined();
    expect(user?.profileCompletedAt).toBeUndefined();
    expect(user?.interestIds).toEqual([]);
  });

  it('BR-U2-32 — an incomplete account is invisible through getProfile', async () => {
    const session = await repositories.auth.verifyCode('09350000000', '12345');
    const profile = await repositories.users.getProfile(session.userId, session.userId);
    expect(profile).toBeNull();
  });

  it('BR-U2-12 — the reserved code always fails', async () => {
    await expect(
      repositories.auth.verifyCode('09350000000', RESERVED_FAILURE_CODE),
    ).rejects.toBeInstanceOf(RefusalError);
  });

  it('signs an existing seeded user in without creating a second account', async () => {
    const before = await repositories.auth.verifyCode('09350000000', '12345');
    await repositories.auth.signOut();
    const after = await repositories.auth.verifyCode('09350000000', '54321');
    expect(after.userId).toBe(before.userId);
  });

  it('signOut clears the session', async () => {
    await repositories.auth.verifyCode('09350000000', '12345');
    expect(await repositories.auth.getSession()).not.toBeNull();

    await repositories.auth.signOut();
    expect(await repositories.auth.getSession()).toBeNull();
    expect(await repositories.users.getCurrentUser()).toBeNull();
  });

  it('completeSetup stamps profileCompletedAt once and makes the profile visible', async () => {
    const session = await repositories.auth.verifyCode('09350000000', '12345');
    const interests = await repositories.reference.listInterestTags();

    const first = await repositories.users.completeSetup(session.userId, {
      displayName: 'مریم',
      interestIds: [interests[0]!.id],
    });
    expect(first.profileCompletedAt).toBeDefined();

    const profile = await repositories.users.getProfile(session.userId, session.userId);
    expect(profile?.displayName).toBe('مریم');

    /* Set ONCE, never re-stamped (BR-U2-30). */
    const second = await repositories.users.updateProfile(session.userId, { bio: 'سلام' });
    expect(second.profileCompletedAt).toBe(first.profileCompletedAt);
  });

  it('INV-3 — a ProfileView carries no contact field', async () => {
    const session = await repositories.auth.verifyCode('09350000000', '12345');
    const interests = await repositories.reference.listInterestTags();

    await repositories.users.completeSetup(session.userId, {
      displayName: 'مریم',
      interestIds: [interests[0]!.id],
      telegramId: 'maryam_t',
    });

    const profile = await repositories.users.getProfile(session.userId, session.userId);
    expect(JSON.stringify(profile)).not.toContain('989350000000');
    expect(JSON.stringify(profile)).not.toContain('maryam_t');
  });
});
