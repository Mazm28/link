import { useMemo } from 'react';
import { useRepositories } from '@app/RepositoryProvider';
import { createAuthService } from '@core/services/authService';
import { createProfileService } from '@core/services/profileService';
import { INTEREST_BY_ID } from '@core/reference/taxonomy';

/**
 * Composes U2's two services from whatever repositories the provider holds.
 *
 * Built here rather than in a provider of their own because a service is a
 * pure function of its repository — there is no state to share, so a context
 * would add a layer that only forwards. If U3 needs the same thing, the
 * pattern moves; it does not need to move first.
 *
 * DEP-2 holds: this reaches `infra/` through `useRepositories`, never by
 * importing it.
 */
export function useIdentityServices() {
  const repositories = useRepositories();

  return useMemo(() => {
    const validationContext = {
      isKnownInterest: (id: Parameters<typeof INTEREST_BY_ID.has>[0]) => INTEREST_BY_ID.has(id),
    };

    return {
      auth: createAuthService(repositories.auth),
      profile: createProfileService(repositories.users, validationContext),

      /**
       * Read the whole session snapshot in one go.
       *
       * Exists so a screen that has just signed in can put the authoritative
       * value into the query cache SYNCHRONOUSLY before navigating past
       * `OnboardingGate`. Awaiting `refetchQueries` is not equivalent: it
       * resolves before React re-renders `SessionProvider`, so a navigation
       * issued straight after still routes on the previous session and the
       * gate bounces the user back to sign-in.
       */
      loadSessionSnapshot: async () => ({
        session: await repositories.auth.getSession(),
        user: await repositories.users.getCurrentUser(),
      }),
    };
  }, [repositories]);
}
