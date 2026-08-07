import type { ReactNode } from 'react';
import { ProfileSetupScreen, SafetyGuidanceScreen, SignInFlow } from '@features/identity';
import { deriveOnboardingState } from '@core/rules/onboarding';
import { Skeleton } from '@ui/Skeleton';
import { useSession } from './SessionProvider';

/**
 * OnboardingGate — Q12 `A`, business-logic-model.md §1.
 *
 * THE ONLY PLACE that decides where a person lands. It sits in `app/` beside
 * `RoleGuard` because this is composition, not a feature — and because there
 * should be exactly one file that answers "why am I on this screen?".
 *
 * It RENDERS the onboarding screens rather than redirecting to routes of their
 * own. The first version redirected, and that was wrong in a way worth
 * recording: the setup and guidance screens then had to navigate back out when
 * they finished, so two mechanisms were steering. React Query resolves its
 * writes before React re-renders this provider, so the navigation a screen
 * issued still routed on the OLD user — the gate saw unfinished onboarding and
 * redirected straight back, and pressing «خواندم» appeared to do nothing at
 * all. Nothing un-redirected once the fresh data landed.
 *
 * Rendering inline removes the race instead of timing around it: the screens
 * write to the cache, this component re-renders with the new state, and the
 * step advances. No screen navigates, so no navigation can be stale.
 *
 * Sign-in is rendered inline too. Its two steps are internal state in
 * `SignInFlow` rather than routes, so nothing about signing in touches the
 * URL — and the destination the user originally asked for survives it.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, session, isLoading, isFetching } = useSession();

  /* Never decide from data that is being replaced. Redirecting on an
   * unresolved session flashes the sign-in screen at an already-signed-in user
   * on every cold load; deciding mid-refetch sends them backwards. */
  if (isLoading || isFetching) {
    return <Skeleton variant="card" lines={3} data-testid="onboarding-gate-loading" />;
  }

  switch (deriveOnboardingState(session, user)) {
    case 'signed_out':
      /* Rendered inline like the other steps, so the URL never changes during
       * sign-in and the phone number has nowhere to leak to (BR-U2-60). It
       * also means the route the user asked for is still the route they are
       * on when they finish. */
      return <SignInFlow />;
    case 'needs_setup':
      return <ProfileSetupScreen />;
    case 'needs_guidance':
      return <SafetyGuidanceScreen variant="onboarding" />;
    case 'onboarded':
      return <>{children}</>;
  }
}
