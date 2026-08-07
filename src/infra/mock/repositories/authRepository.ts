import type { Session, User, UserId } from '@core/domain';
import { newUserId } from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type { AuthRepository } from '@core/repositories';
import { isAcceptedByMock, RESEND_AFTER_SECONDS } from '@core/rules/otp';
import { normalizePhone } from '@core/rules/phone';
import type { MockContext } from './context';

/**
 * Mocked authentication — U2, business-logic-model.md §2.
 *
 * NFR-S6, stated once and meant throughout: none of this is a security
 * control. It is the SHAPE of one. Round 2 replaces this file with HTTP calls
 * to a server that performs the same checks somewhere the user cannot reach,
 * and no screen changes when it does.
 */
export function createAuthRepository(ctx: MockContext): AuthRepository {
  return {
    /**
     * BR-U2-11 — the response is byte-identical for a known and an unknown
     * number, and the code path does not branch on whether the account exists.
     *
     * The lookup is deliberately NOT performed here. A branch, even one that
     * returns the same value on both sides, is a timing difference and an
     * invitation for someone to later add a "helpful" distinction to it.
     */
    async requestCode(phone: string): Promise<{ sent: true; resendAfterSeconds: number }> {
      await ctx.delay();

      if (normalizePhone(phone) === null) {
        refusal(ErrorCode.PHONE_INVALID_FORMAT, 'errors.phoneInvalidFormat');
      }

      /* Round 1 sends nothing. Round 2 calls Kavenegar here, with a timeout
       * and the degraded mode NFR-R10 requires. */
      return { sent: true, resendAfterSeconds: RESEND_AFTER_SECONDS };
    },

    /**
     * BR-U2-13 — verifies, then signs in, CREATING the account if the number
     * is unknown. The caller cannot tell which happened.
     */
    async verifyCode(phone: string, code: string): Promise<Session> {
      await ctx.delay();

      const canonical = normalizePhone(phone);
      if (canonical === null) {
        refusal(ErrorCode.PHONE_INVALID_FORMAT, 'errors.phoneInvalidFormat');
      }

      if (!isAcceptedByMock(code)) {
        refusal(ErrorCode.OTP_INVALID, 'errors.otpInvalid');
      }

      let userId: UserId | undefined;
      let refuseSuspended = false;

      ctx.store.mutate((draft) => {
        const existing = draft.users.find((u) => u.phone === canonical);

        if (existing) {
          /* BR-U2-72 — a suspended account cannot authenticate, and is refused
           * with the SAME code as a wrong OTP. A distinct "your account is
           * suspended" message would confirm to whoever is trying that the
           * account exists. */
          if (existing.accountStatus === 'suspended') {
            refuseSuspended = true;
            return;
          }
          userId = existing.id;
        } else {
          const created: User = {
            id: newUserId(),
            phone: canonical,
            interestIds: [],
            accountType: 'user',
            accountStatus: 'active',
            isAnonymized: false,
            createdAt: new Date().toISOString(),
            /* No displayName, no homeNeighborhoodId, no profileCompletedAt.
             * This account is signed in and has no public presence until setup
             * completes (BR-U2-32). */
          };
          draft.users.push(created);
          userId = created.id;
        }

        const session: Session = {
          userId,
          startedAt: new Date().toISOString(),
        };
        draft.session = session;
        draft.currentUserId = userId;
      });

      if (refuseSuspended) refusal(ErrorCode.OTP_INVALID, 'errors.otpInvalid');
      if (userId === undefined) refusal(ErrorCode.OTP_INVALID, 'errors.otpInvalid');

      const session = ctx.store.read().session;
      if (session === null) refusal(ErrorCode.STORE_UNAVAILABLE, 'errors.storeUnavailable');
      return session;
    },

    async getSession(): Promise<Session | null> {
      await ctx.delay();
      return ctx.store.read().session;
    },

    /** Round 1 clears the local session only. US-04 requires server-side
     *  invalidation, which is Round 2 — recorded rather than pretended. */
    async signOut(): Promise<void> {
      await ctx.delay();
      ctx.store.mutate((draft) => {
        draft.session = null;
        draft.currentUserId = null;
      });
    },
  };
}
