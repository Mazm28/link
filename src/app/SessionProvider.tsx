import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AccountType, Session, User, UserId } from '@core/domain';
import { useRepositories } from './RepositoryProvider';

interface SessionValue {
  user: User | null;
  /** U2 — the session record itself, needed by `OnboardingGate` to tell
   *  "signed out" from "signed in but not set up". */
  session: Session | null;
  /** BR-U1-70 — the viewer passed to every scoped read. `null` when signed out. */
  viewerId: UserId | null;
  accountType: AccountType | null;
  isLoading: boolean;
  /** True while the session is being re-read. The gate must not decide from
   *  data it already knows is being replaced. */
  isFetching: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * The session cache key and its shape, exported so a screen that has just
 * WRITTEN a new session or user can put the authoritative response straight
 * into the cache.
 *
 * That matters for anything that navigates past `OnboardingGate` afterwards.
 * `invalidateQueries` — and even `refetchQueries` — resolve before React has
 * re-rendered this provider, so a navigation issued straight after still
 * routes on the OLD value: the gate sees an unfinished profile, redirects
 * back, and the user's press appears to do nothing. Writing the value we
 * already hold is synchronous, so the gate cannot decide from stale data.
 */
export const SESSION_QUERY_KEY = ['session'] as const;

export interface SessionSnapshot {
  session: Session | null;
  user: User | null;
}

/**
 * BR-U1-70 / BR-U1-71 — viewer resolution.
 *
 * A null viewer is a real, defined state, not an oversight. Signed-out
 * browsing is out of Round-1 scope, but the null case flows all the way to the
 * projection, where it receives the MOST RESTRICTIVE view. Defining it now
 * means a future "public preview" feature inherits fail-closed behaviour
 * instead of becoming the widest data leak in the product.
 *
 * BR-U1-72 — a `suspended` account cannot authenticate. Round 1 has no
 * suspension mechanism, but the check exists so Round 3 adds accounts rather
 * than adding an enforcement point.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const repositories = useRepositories();

  /* One query for both, so the two can never disagree about who is signed in.
   * Two queries would resolve at different times, and the window between them
   * is exactly when OnboardingGate would send a signed-in user to sign-in. */
  const { data, isLoading, isFetching } = useQuery<SessionSnapshot>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const session = await repositories.auth.getSession();
      const user = await repositories.users.getCurrentUser();
      return { session, user };
    },
  });

  const user = data?.user ?? null;
  const active = user !== null && user.accountStatus !== 'suspended' ? user : null;

  const value: SessionValue = {
    user: active,
    /* A suspended account has no session either — otherwise the gate would see
     * "signed in, no user" and loop (BR-U1-72). */
    session: active === null ? null : (data?.session ?? null),
    viewerId: active?.id ?? null,
    accountType: active?.accountType ?? null,
    isLoading,
    isFetching,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}
