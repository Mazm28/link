import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { Repositories } from '@core/repositories';
/* ==========================================================================
 * THE ONE PERMITTED infra/ IMPORT (DEP-2).
 *
 * ESLint fails the build if any other file under app/, ui/, or features/
 * imports from infra/. This is the composition root — the single place a
 * concrete data-layer implementation is named.
 *
 * Round 2 changes exactly this line and the call below:
 *     import { createHttpBackend } from '@infra/http';
 * No screen changes. `tests/app/repository-swap.test.tsx` proves it.
 * ========================================================================== */
import { createMockBackend, isMockLatencyEnabled, setMockLatencyEnabled } from '@infra/mock';

import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { DirectionProvider } from './DirectionProvider';
import { ThemeProvider } from './ThemeProvider';
import { I18nProvider } from './I18nProvider';
import { RepositoryProvider } from './RepositoryProvider';
import { QueryProvider } from './QueryProvider';
import { SessionProvider } from './SessionProvider';
import { FeedFilterProvider } from './FeedFilterProvider';
import { CityProvider } from './CityProvider';
import { AppRouter } from './AppRouter';
import { DevMenu } from './DevMenu';

export interface AppProps {
  /**
   * Injected repositories, for tests and for the Round-2 swap. When omitted
   * the mock backend is built.
   *
   * This parameter is the whole NFR-A1 argument in one line: if a screen ever
   * needed to change when this changes, the seam would not be real.
   */
  repositories?: Repositories | undefined;
}

export function App({ repositories }: AppProps = {}) {
  const [backend] = useState(() => (repositories ? null : createMockBackend()));
  const activeRepositories = repositories ?? backend!.repositories;
  const [latency, setLatency] = useState(isMockLatencyEnabled);

  const diagnostics = backend?.store.getDiagnostics();

  return (
    /* Ordering is deliberate (frontend-components.md §4.1):
     *   - the error boundary is OUTERMOST, so a failure inside any provider
     *     still renders a Persian message rather than a blank page;
     *   - direction and i18n come BEFORE the data layer, so even a repository
     *     failure renders its error correctly localized and correctly oriented. */
    <GlobalErrorBoundary>
      <DirectionProvider>
        {/* Theme sits beside direction, above the data layer: both are
         * presentation facts the app should get right even if a repository
         * fails and only an error state renders. */}
        <ThemeProvider>
          <I18nProvider>
            <RepositoryProvider repositories={activeRepositories}>
              <QueryProvider>
                <SessionProvider>
                  <CityProvider>
                    <FeedFilterProvider>
                      <BrowserRouter>
                        <AppRouter />
                        {backend ? (
                          <DevMenu
                            onReset={() => backend.reset()}
                            latencyEnabled={latency}
                            onToggleLatency={(enabled) => {
                              setMockLatencyEnabled(enabled);
                              setLatency(enabled);
                            }}
                            schemaMismatch={diagnostics?.didResetOnVersionMismatch ?? false}
                            memoryFallback={diagnostics?.usingMemoryFallback ?? false}
                          />
                        ) : null}
                      </BrowserRouter>
                    </FeedFilterProvider>
                  </CityProvider>
                </SessionProvider>
              </QueryProvider>
            </RepositoryProvider>
          </I18nProvider>
        </ThemeProvider>
      </DirectionProvider>
    </GlobalErrorBoundary>
  );
}
