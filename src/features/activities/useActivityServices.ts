import { useMemo } from 'react';
import { useRepositories } from '@app/RepositoryProvider';
import { createActivityService } from '@core/services/activityService';

/** Composes the activity service from whatever repositories the provider
 *  holds. Same pattern as `useIdentityServices` — a service is a pure function
 *  of its repository, so a context would only forward. */
export function useActivityService() {
  const repositories = useRepositories();
  return useMemo(() => createActivityService(repositories.activities), [repositories]);
}
