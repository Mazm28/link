import { useMemo } from 'react';
import { useRepositories } from '@app/RepositoryProvider';
import { createSafetyService } from '@core/services/safetyService';

/** Same pattern as the other feature service hooks — a service is a pure
 *  function of its repository, so a context would only forward. */
export function useSafetyService() {
  const repositories = useRepositories();
  return useMemo(() => createSafetyService(repositories.safety), [repositories]);
}
