import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/* ------------------------------------------------------------------------- *
 * fast-check global configuration — PBT-08
 *
 * Two settings here are deliberate and must not be "tidied away":
 *
 *   endOnFailure: false  keeps SHRINKING ENABLED. A shrunk counterexample is
 *                        the difference between "some 400-character Persian
 *                        string failed" and "the string 'ك‌' failed".
 *                        PBT-08 forbids disabling it.
 *
 *   seed + logging       every run prints its seed, so any failure is
 *                        reproducible by pinning that seed. A property test
 *                        that cannot be reproduced cannot be fixed, only
 *                        retried away — which PBT-08 also forbids.
 * ------------------------------------------------------------------------- */
const seed = Number(process.env['FC_SEED'] ?? Date.now());

fc.configureGlobal({
  numRuns: Number(process.env['FC_NUM_RUNS'] ?? 200),
  seed,
  endOnFailure: false,
  verbose: fc.VerbosityLevel.Verbose,
});

console.info(`[pbt] fast-check seed = ${seed} (re-run with FC_SEED=${seed})`);

/* BR-U1-45: the mock repositories simulate 150-300 ms latency so that loading,
 * empty, and error states actually render in the app. Paying that cost in the
 * test suite would buy nothing, so it is switched off here rather than in the
 * store itself. */
process.env['MOCK_LATENCY'] = '0';

/* jsdom does not implement matchMedia, which the theme and reduced-motion
 * checks read. A minimal stub keeps component tests from crashing on mount. */
beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
