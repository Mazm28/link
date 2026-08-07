import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AccountType } from '@core/domain';
import { useSession } from './SessionProvider';

export interface RoleGuardProps {
  allow: AccountType[];
  children: ReactNode;
  redirectTo?: string | undefined;
}

/**
 * Route gating by account type — used for `/venue/*` in U5 and the Round-3
 * admin console.
 *
 * CLIENT-SIDE GATING IS UX ONLY (NFR-S6). This component decides what is worth
 * rendering; it decides nothing about what a user may access. The repository
 * layer is the enforcement boundary, and in Round 2 the server re-enforces the
 * same rules. Anyone can edit their own JavaScript — nobody can edit the
 * server's answer.
 *
 * It redirects rather than rendering a "forbidden" screen, so a mistyped URL
 * does not confirm that a restricted area exists.
 */
export function RoleGuard({ allow, children, redirectTo = '/' }: RoleGuardProps) {
  const { accountType, isLoading } = useSession();

  if (isLoading) return null;
  if (accountType === null || !allow.includes(accountType)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
