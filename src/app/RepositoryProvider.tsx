import { createContext, useContext, type ReactNode } from 'react';
import type { Repositories } from '@core/repositories';

const RepositoryContext = createContext<Repositories | null>(null);

/**
 * THE NFR-A1 SEAM.
 *
 * This is the single point at which a data-layer implementation is chosen.
 * Every screen in the product reads through this context and never names a
 * concrete implementation, which is what makes the Round-2 swap a one-line
 * change in `App.tsx` rather than an edit to every screen.
 *
 * DEP-2 makes that structural: ESLint fails the build if anything under
 * `features/`, `ui/`, or `app/` — other than `App.tsx` — imports from
 * `infra/`. A `features/` → `infra/` import would fail no test and be
 * invisible in the running app; it would surface only when someone tried the
 * swap and found a screen welded to localStorage.
 *
 * `tests/app/repository-swap.test.tsx` is what turns this from an intention
 * into a verified property.
 */
export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) {
    // A missing provider is a defect, not a business outcome (BR-U1-50), so
    // it throws and is caught by GlobalErrorBoundary.
    throw new Error('useRepositories must be used within RepositoryProvider');
  }
  return repositories;
}
