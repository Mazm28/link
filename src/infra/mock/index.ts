import type { Repositories } from '@core/repositories';
import { LocalStore } from './LocalStore';
import { createSeed } from './seed';
import { MockContext } from './repositories/context';
import { createAuthRepository } from './repositories/authRepository';
import { createUserRepository } from './repositories/userRepository';
import { createActivityRepository } from './repositories/activityRepository';
import { createConnectionRepository } from './repositories/connectionRepository';
import { createVenueRepository } from './repositories/venueRepository';
import { createSafetyRepository } from './repositories/safetyRepository';
import { createNotificationRepository } from './repositories/notificationRepository';
import { createReferenceRepository } from './repositories/referenceRepository';

export {
  LocalStore,
  SCHEMA_VERSION,
  setMockLatencyEnabled,
  isMockLatencyEnabled,
} from './LocalStore';
export type { StoreShape, StoreDiagnostics } from './LocalStore';
export { createSeed } from './seed';
export { MockContext } from './repositories/context';

export interface MockBackend {
  repositories: Repositories;
  store: LocalStore;
  reset(): void;
}

/**
 * Build the complete mock backend.
 *
 * This is the ONLY thing `app/App.tsx` imports from `infra/` (DEP-2, enforced
 * by ESLint). Round 2 adds `createHttpBackend()` alongside it with the same
 * return shape, and the swap is a one-line change in one file — which is the
 * claim `tests/app/repository-swap.test.tsx` exists to verify rather than
 * assert.
 */
export function createMockBackend(): MockBackend {
  const store = LocalStore.load(() => createSeed());
  const ctx = new MockContext(store);

  return {
    store,
    repositories: {
      auth: createAuthRepository(ctx),
      users: createUserRepository(ctx),
      activities: createActivityRepository(ctx),
      connections: createConnectionRepository(ctx),
      venues: createVenueRepository(ctx),
      safety: createSafetyRepository(ctx),
      notifications: createNotificationRepository(ctx),
      reference: createReferenceRepository(),
    },
    reset: () => store.reset(() => createSeed()),
  };
}
