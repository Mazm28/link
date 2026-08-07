import type { ProfileView, User, UserId } from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type { ProfilePatch, ProfileSetupInput, UserRepository } from '@core/repositories';
import type { MockContext } from './context';

export function createUserRepository(ctx: MockContext): UserRepository {
  return {
    async getCurrentUser(): Promise<User | null> {
      await ctx.delay();
      const id = ctx.store.read().currentUserId;
      if (id === null) return null;
      return ctx.findUser(id as UserId) ?? null;
    },

    /** INV-3/INV-4: returns a ProfileView, which structurally cannot carry
     *  `phone` or `telegramId`. The viewer parameter is required by the
     *  signature even though Round 1 does not vary the result by viewer —
     *  U6 will, once blocking hides profiles. */
    async getProfile(_viewerId: UserId | null, userId: UserId): Promise<ProfileView | null> {
      await ctx.delay();
      /* Null for an unknown user AND for one who has not completed setup
       * (BR-U2-32). `profileOrNull` is the version that tells the truth;
       * `profileOf` exists only so a feed can render a missing author without
       * crashing. */
      return ctx.profileOrNull(userId);
    },

    /**
     * BR-U2-30 — the one-time completion transition.
     *
     * Separate from updateProfile because it is the only write that stamps
     * `profileCompletedAt`, and because it applies a whole validated input
     * rather than a partial patch. Nothing is written unless every field is
     * present — a partially applied setup would leave a user who is neither
     * complete nor incomplete.
     */
    async completeSetup(userId: UserId, input: ProfileSetupInput): Promise<User> {
      await ctx.delay();
      let updated: User | undefined;

      ctx.store.mutate((draft) => {
        const user = draft.users.find((u) => u.id === userId);
        if (!user) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

        user.displayName = input.displayName;
        user.interestIds = input.interestIds;
        if (input.homeCityId !== undefined) user.homeCityId = input.homeCityId;
        if (input.bio !== undefined) user.bio = input.bio;
        if (input.telegramId !== undefined) user.telegramId = input.telegramId;
        if (input.avatarId !== undefined) user.avatarId = input.avatarId;

        /* Set ONCE and never cleared (BR-U2-31). */
        user.profileCompletedAt ??= new Date().toISOString();

        updated = user;
      });

      if (!updated) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return updated;
    },

    /** US-73 — per USER, not per device, so it survives a new browser. */
    async markSafetyGuidanceSeen(userId: UserId): Promise<User> {
      await ctx.delay();
      let updated: User | undefined;

      ctx.store.mutate((draft) => {
        const user = draft.users.find((u) => u.id === userId);
        if (!user) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        user.safetyGuidanceSeenAt ??= new Date().toISOString();
        updated = user;
      });

      if (!updated) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return updated;
    },

    async updateProfile(userId: UserId, patch: ProfilePatch): Promise<User> {
      await ctx.delay();
      let updated: User | undefined;

      ctx.store.mutate((draft) => {
        const user = draft.users.find((u) => u.id === userId);
        if (!user) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');

        // Only assign keys actually present in the patch, so an omitted field
        // is left alone rather than being overwritten with undefined.
        if (patch.displayName !== undefined) user.displayName = patch.displayName;
        if (patch.bio !== undefined) user.bio = patch.bio;
        if (patch.avatarId !== undefined) user.avatarId = patch.avatarId;
        if (patch.interestIds !== undefined) user.interestIds = patch.interestIds;
        if (patch.homeCityId !== undefined) user.homeCityId = patch.homeCityId;
        if (patch.telegramId !== undefined) user.telegramId = patch.telegramId;

        updated = user;
      });

      if (!updated) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return updated;
    },

    /**
     * US-03 — anonymize, do not erase.
     *
     * Personal data is cleared, but authored activities stay so that other
     * people's history does not develop holes: a past activity someone
     * attended and rated should not vanish because the host left.
     */
    async deleteAccount(userId: UserId): Promise<void> {
      await ctx.delay();
      ctx.store.mutate((draft) => {
        const user = draft.users.find((u) => u.id === userId);
        if (!user) return;

        user.displayName = '—';
        user.phone = '';
        delete user.homeCityId;
        delete user.telegramId;
        delete user.bio;
        delete user.avatarId;
        user.interestIds = [];
        user.isAnonymized = true;

        // Contact details already disclosed in past requests are snapshots of
        // what was actually shared; they are revoked, not rewritten (US-33).
        for (const request of draft.joinRequests) {
          if (request.requesterId === userId) {
            request.sharedContact = { kind: 'none' };
            request.contactRevoked = true;
          }
        }

        if (draft.currentUserId === userId) {
          draft.currentUserId = null;
          draft.session = null;
        }
      });
    },
  };
}
