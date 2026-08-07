/* ===========================================================================
 * Error taxonomy — business-rules.md §6 (BR-U1-50 … 54), Q7 `A`
 *
 * Two failure categories, handled differently on purpose:
 *
 *   EXPECTED FAILURE  a legitimate business outcome — validation rejected, a
 *                     rule refused, nothing found. Returned as a typed Result.
 *                     The caller is expected to handle it; it is not a bug.
 *
 *   DEFECT            a bug or a broken environment — a missing repository,
 *                     a corrupt store, an unreachable branch. Thrown, and
 *                     caught by GlobalErrorBoundary.
 *
 * Conflating the two is what produces either a crash on a bad password or a
 * silently swallowed programming error. Keeping them apart means every
 * `Result` at a call site is a real decision the caller has to make.
 * =========================================================================== */

export interface AppError {
  /** Stable and machine-readable. Safe to branch on; never shown to a user. */
  code: string;
  /**
   * A KEY into the Persian catalogue, never a message string (BR-U1-51).
   * A hard-coded English error string reaching a user would be a visible
   * defect in a Persian-only product, so the type makes it impossible to
   * construct an error carrying prose.
   */
  messageKey: string;
  /** Interpolation values for the catalogue entry — e.g. { max: '۴۰' }. */
  details?: Record<string, string>;
}

export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E extends AppError>(error: E): Result<never, E> => ({ ok: false, error });

export function appError(
  code: string,
  messageKey: string,
  details?: Record<string, string>,
): AppError {
  return details === undefined ? { code, messageKey } : { code, messageKey, details };
}

export const isOk = <T, E extends AppError>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;

export const isErr = <T, E extends AppError>(r: Result<T, E>): r is { ok: false; error: E } =>
  !r.ok;

/**
 * Unwrap a Result, throwing a DefectError when it failed.
 *
 * Only for call sites where failure genuinely cannot happen — seed
 * construction, tests. Reaching for this to avoid handling an expected
 * failure defeats the point of the taxonomy.
 */
export function unwrap<T>(r: Result<T>, context: string): T {
  if (r.ok) return r.value;
  throw new DefectError(`${context}: ${r.error.code}`);
}

/**
 * A bug, not a business outcome. Reaches GlobalErrorBoundary, which renders a
 * generic Persian message — no stack trace, no internal path, no store
 * internals reach the user (BR-U1-53, NFR-S7, SECURITY-09).
 */
export class DefectError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DefectError';
  }
}

/**
 * A repository refusing a write.
 *
 * The repository interfaces return plain promises (component-methods.md §3),
 * while services return `Result` (§4). This is the bridge: a repository throws
 * a RefusalError carrying an AppError, and the service catches it and converts
 * it to `err(...)`. The alternative — making every repository method return a
 * Result — would push failure handling into every call site including the ones
 * that genuinely cannot fail.
 *
 * NFR-S6: this is the ENFORCEMENT boundary, not the UI. Hiding a control in a
 * component is UX; the repository refusing is the check. Round 2 re-enforces
 * the same rules server-side.
 */
export class RefusalError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.code);
    this.name = 'RefusalError';
  }
}

export function refusal(code: string, messageKey: string): never {
  throw new RefusalError(appError(code, messageKey));
}

/* ---------------------------------------------------------------- refusals */

/**
 * BR-U1-52: a refusal carries a REASON CODE, never a bare boolean.
 *
 * US-52 requires the UI to explain *why* rating is unavailable — "the activity
 * hasn't happened yet" and "you weren't confirmed as attending" need different
 * messages. A boolean cannot carry that, and a caller given one has no choice
 * but to invent a message or say nothing.
 */
export type Decision<TReason extends string> =
  | { allowed: true }
  | { allowed: false; reason: TReason };

export const allow = (): Decision<never> => ({ allowed: true });

export const refuse = <TReason extends string>(reason: TReason): Decision<TReason> => ({
  allowed: false,
  reason,
});

/**
 * BR-U1-54 / SECURITY-15 — FAIL CLOSED.
 *
 * Wrap a rule evaluation so that a thrown exception becomes a refusal rather
 * than propagating, and never becomes permission. A `canRate` that throws must
 * not be treated as `true`; if a rule cannot be evaluated, the answer is no.
 */
export function failClosed<TReason extends string>(
  evaluate: () => Decision<TReason>,
  fallbackReason: TReason,
): Decision<TReason> {
  try {
    return evaluate();
  } catch (cause) {
    if (import.meta.env?.DEV) {
      console.error('[fail-closed] rule evaluation threw; refusing', cause);
    }
    return refuse(fallbackReason);
  }
}

/* ------------------------------------------------------------- error codes */

/** Validation and store failure codes owned by U1 (business-rules.md §7). */
export const ErrorCode = {
  NAME_INVALID_LENGTH: 'name_invalid_length',
  BIO_TOO_LONG: 'bio_too_long',
  PHONE_INVALID_FORMAT: 'phone_invalid_format',
  TELEGRAM_INVALID_FORMAT: 'telegram_invalid_format',
  INTERESTS_REQUIRED: 'interests_required',
  NEIGHBORHOOD_INVALID: 'neighborhood_invalid',
  DATE_OUT_OF_RANGE: 'date_out_of_range',
  STORE_UNAVAILABLE: 'store_unavailable',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',

  /* --- U2, business-rules.md §9. All are EXPECTED refusals; none throws. --- */

  /** Wrong code, reserved failure code, OR a suspended account. Deliberately
   *  one code for all three — see BR-U2-72. */
  OTP_INVALID: 'otp_invalid',
  OTP_RESEND_TOO_SOON: 'otp_resend_too_soon',
  INTERESTS_TOO_MANY: 'interests_too_many',
  /** No letter present, or control/bidi-override characters found. */
  NAME_INVALID_CHARACTERS: 'name_invalid_characters',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  CONFIRMATION_MISMATCH: 'confirmation_mismatch',
  /** CR-02 item 4 — a city that is not in the reference list. */
  CITY_INVALID: 'city_invalid',

  /* --- U3, business-rules.md §1-§3. --- */

  /** US-11 — no precision chosen. There is deliberately no default to fall
   *  back on, so this is a refusal rather than an assumption. */
  PRECISION_REQUIRED: 'precision_required',
  ADDRESS_REQUIRED: 'address_required',
  DATE_IN_PAST: 'date_in_past',
  DATE_TOO_FAR: 'date_too_far',
  TITLE_INVALID_LENGTH: 'title_invalid_length',
  DESCRIPTION_INVALID_LENGTH: 'description_invalid_length',
  CAPACITY_INVALID: 'capacity_invalid',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
