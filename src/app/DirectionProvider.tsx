import { useEffect, type ReactNode } from 'react';

/**
 * FC-U1-03 / US-90 — `dir="rtl"` and `lang="fa"` on the document root.
 *
 * `index.html` already ships both attributes, so a cold load never flashes a
 * mirrored layout. This provider re-asserts them for the case where the app is
 * mounted into a host page that did not set them (a test harness, or an
 * embedded preview), rather than being the primary mechanism.
 */
export function DirectionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'fa');
  }, []);

  return <>{children}</>;
}
