import type { Session } from '../domain';
import { type AppError, ErrorCode, appError, err, ok, type Result, RefusalError } from '../errors';
import type { AuthRepository } from '../repositories';
import { isWellFormedOtp } from '../rules/otp';
import { normalizePhone } from '../rules/phone';

/* ===========================================================================
 * authService — services.md §4.1, business-logic-model.md §2
 *
 * DEP-4: this file imports a repository INTERFACE and nothing from `infra/`.
 * That is the whole reason AuthRepository exists (Q2 `A`) — a service reaching
 * localStorage directly would pass every test in this repo and then silently
 * fail the Round-2 swap, which is the one thing the architecture is for.
 *
 * services.md §4.1 warns this service changes more than any other between
 * rounds. Nothing in its signatures reveals that Round 1 is mocked.
 * =========================================================================== */

/** Repositories throw `RefusalError`; services return `Result`. This is the
 *  bridge (see errors.ts) — it exists so call sites that genuinely cannot fail
 *  are not forced to handle failures. */
async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

export function createAuthService(repository: AuthRepository) {
  return {
    /**
     * BR-U2-04 — validation runs here, BEFORE the repository is touched. A
     * malformed number never reaches `requestCode`, so it never becomes a
     * request in Round 2 either.
     */
    async requestCode(rawPhone: string): Promise<Result<{ resendAfterSeconds: number }, AppError>> {
      const phone = normalizePhone(rawPhone);
      if (phone === null) {
        return err(appError(ErrorCode.PHONE_INVALID_FORMAT, 'errors.phoneInvalidFormat'));
      }

      return toResult(async () => {
        const { resendAfterSeconds } = await repository.requestCode(phone);
        return { resendAfterSeconds };
      });
    },

    /**
     * The canonical phone is passed through, never re-derived from user input
     * at this point: the number was normalized when the code was requested,
     * and normalizing twice from two different sources is how the lookup and
     * the "sent to" value drift apart.
     */
    async verifyCode(canonicalPhone: string, code: string): Promise<Result<Session, AppError>> {
      if (!isWellFormedOtp(code)) {
        /* Same generic refusal as a wrong code (BR-U2-14). A distinct "that is
         * not five digits" message is harmless here, but it would establish a
         * pattern of the screen explaining itself, and the next distinction
         * someone adds is the one that leaks. */
        return err(appError(ErrorCode.OTP_INVALID, 'errors.otpInvalid'));
      }

      return toResult(() => repository.verifyCode(canonicalPhone, code));
    },

    async getSession(): Promise<Session | null> {
      return repository.getSession();
    },

    async signOut(): Promise<Result<void, AppError>> {
      return toResult(() => repository.signOut());
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
