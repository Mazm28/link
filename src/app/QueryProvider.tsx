import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * TanStack Query gives loading and error states for every async surface for
 * free, which is what makes NFR-U5 practical rather than something each screen
 * reimplements. Its `queryFn` is also exactly where the repository call sits,
 * so the Round-2 swap changes nothing here either.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mock reads are cheap; real ones in Round 2 will not be, and a
            // refetch on every window focus over a constrained Iranian mobile
            // connection is a poor default to inherit.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
