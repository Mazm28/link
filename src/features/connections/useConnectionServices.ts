import { useMemo } from 'react';
import { useRepositories } from '@app/RepositoryProvider';
import { createConnectionService } from '@core/services/connectionService';
import { createNotificationService } from '@core/services/notificationService';

/** Same pattern as `useActivityService` — a service is a pure function of its
 *  repository, so a context would only forward. */
export function useConnectionService() {
  const repositories = useRepositories();
  return useMemo(() => createConnectionService(repositories.connections), [repositories]);
}

export function useNotificationService() {
  const repositories = useRepositories();
  return useMemo(() => createNotificationService(repositories.notifications), [repositories]);
}
