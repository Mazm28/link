import type { User, UserId } from '../domain';
import { type AppError, ErrorCode, appError, err, ok, type Result, RefusalError } from '../errors';
import type { ProfilePatch, UserRepository } from '../repositories';
import {
  type FieldErrors,
  type SetupDraft,
  type ValidationContext,
  type ValidationResult,
  validateProfileSetup,
  validateProfilePatch,
} from '../rules/profileValidation';

/* ===========================================================================
 * profileService — services.md §4.2
 *
 * Validation runs HERE, before every write, rather than only in the form.
 * A screen validating its own fields is UX; this is the layer a second caller
 * — U5's venue profile, a Round-2 API client — goes through too. NFR-S6 still
 * applies: neither is the security boundary. Round 2 re-validates server-side.
 * =========================================================================== */

async function toResult<T>(operation: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    return ok(await operation());
  } catch (cause) {
    if (cause instanceof RefusalError) return err(cause.appError);
    throw cause;
  }
}

export function createProfileService(repository: UserRepository, ctx: ValidationContext) {
  return {
    /** BR-U2-30 — nothing is written unless the whole draft validates. */
    async completeSetup(userId: UserId, draft: SetupDraft): Promise<ValidationResult<User>> {
      const validated = validateProfileSetup(draft, ctx);
      if (!validated.ok) return validated;

      const written = await toResult(() => repository.completeSetup(userId, validated.value));
      return written.ok
        ? { ok: true, value: written.value }
        : { ok: false, errors: { form: written.error } };
    },

    /**
     * BR-U2-33 — an edit may not make a complete profile invalid.
     *
     * The patch arrives already reduced to changed keys by `buildProfilePatch`;
     * this re-validates it rather than trusting the caller, because the same
     * method is reachable from anywhere holding the service.
     */
    async updateProfile(original: User, patch: ProfilePatch): Promise<ValidationResult<User>> {
      const validated = validateProfilePatch(patch, ctx);
      if (!validated.ok) return validated;

      /* An empty patch is a no-op, not an error. Pressing save without editing
       * anything should be quietly harmless rather than a round trip. */
      if (Object.keys(validated.value).length === 0) return { ok: true, value: original };

      const written = await toResult(() => repository.updateProfile(original.id, validated.value));
      return written.ok
        ? { ok: true, value: written.value }
        : { ok: false, errors: { form: written.error } };
    },

    async markSafetyGuidanceSeen(userId: UserId): Promise<Result<User, AppError>> {
      return toResult(() => repository.markSafetyGuidanceSeen(userId));
    },

    /**
     * US-03 — anonymize, do not erase.
     *
     * The confirmation word is checked HERE as well as in the dialog. The
     * dialog is what the user sees; this is what makes the check exist for any
     * other caller. It is not a security control (NFR-S6) — it is a guard
     * against an accidental programmatic call, which for an irreversible
     * operation with no backup is worth one comparison.
     */
    async deleteAccount(
      userId: UserId,
      confirmation: string,
      expectedWord: string,
    ): Promise<Result<void, AppError>> {
      if (confirmation.trim() !== expectedWord) {
        return err(appError(ErrorCode.CONFIRMATION_MISMATCH, 'errors.confirmationMismatch'));
      }
      return toResult(() => repository.deleteAccount(userId));
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
export type { FieldErrors };
