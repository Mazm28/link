import type { Session, User } from '../domain';

/* ===========================================================================
 * Onboarding state — business-logic-model.md §1 (BR-U2-30 … 32)
 *
 * DERIVED on every read, never stored. There is no `onboardingState` field,
 * for the same reason there is no stored `past` flag on an activity
 * (BR-U1-17): a stored state needs something to keep it true, and nothing
 * here would.
 * =========================================================================== */

export type OnboardingState = 'signed_out' | 'needs_setup' | 'needs_guidance' | 'onboarded';

/**
 * BR-U2-31 — the SINGLE definition of a complete profile.
 *
 * Reads `profileCompletedAt` and nothing else. The tempting alternative —
 * `interestIds.length > 0 && homeNeighborhoodId !== undefined` — is NOT
 * equivalent: a user who completed setup and is midway through clearing and
 * re-picking their interests on the edit screen would be judged incomplete and
 * thrown back into onboarding, losing the edit.
 */
export function isProfileComplete(user: User | null): boolean {
  return user?.profileCompletedAt !== undefined;
}

export function hasSeenSafetyGuidance(user: User | null): boolean {
  return user?.safetyGuidanceSeenAt !== undefined;
}

export function deriveOnboardingState(session: Session | null, user: User | null): OnboardingState {
  if (session === null || user === null) return 'signed_out';
  if (!isProfileComplete(user)) return 'needs_setup';
  if (!hasSeenSafetyGuidance(user)) return 'needs_guidance';
  return 'onboarded';
}

/**
 * Where each state sends a user.
 *
 * `OnboardingGate` renders the middle two states inline rather than routing to
 * them (see its comment), so this is used by tests and by anything that needs
 * to reason about onboarding as paths. Kept because the mapping is part of the
 * rule, not part of the component that happens to apply it.
 */
export function redirectFor(state: OnboardingState): string | null {
  switch (state) {
    case 'signed_out':
      return '/auth/phone';
    case 'needs_setup':
      return '/onboarding/profile';
    case 'needs_guidance':
      return '/onboarding/safety';
    case 'onboarded':
      return null;
  }
}

/**
 * BR-U2-32 — what an incomplete account may not do.
 *
 * Enforced structurally for READS (`ProfileView` requires fields an incomplete
 * user lacks), but writes need an explicit check: nothing about the type of
 * `createActivity` stops a half-registered account calling it.
 */
export function mayActInPublic(user: User | null): boolean {
  return isProfileComplete(user) && user?.accountStatus === 'active' && !user.isAnonymized;
}
