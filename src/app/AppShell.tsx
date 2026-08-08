import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@ui/Badge';
import { IconSearch, LogoMark } from '@ui/icons';
import { useI18n } from './I18nProvider';
import { useSession } from './SessionProvider';
import { useTheme } from './ThemeProvider';
import { useFeedFilters } from './FeedFilterProvider';
import { useNotificationService } from '@features/connections';
import { CitySwitcher } from './CitySwitcher';

/* No «جست‌وجو» destination: the search field is in the bar on every screen, so
 * a nav item leading to a page that does the same thing is a second door to
 * one room. Removing it also widens the remaining four. */
const NAV_ITEMS = [
  { to: '/', key: 'nav.feed', testId: 'app-shell-nav-feed', icon: '🏠' },
  { to: '/create', key: 'nav.create', testId: 'app-shell-nav-create', icon: '➕' },
  { to: '/requests', key: 'nav.requests', testId: 'app-shell-nav-requests', icon: '✉️' },
  { to: '/profile', key: 'nav.profile', testId: 'app-shell-nav-profile', icon: '👤' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { viewerId } = useSession();
  const { resolved, toggle } = useTheme();
  const { query, setQuery } = useFeedFilters();

  /* ⚠️ U4 / BR-U4-102 — UNREAD REQUESTS, not unread notifications.
   *
   * This used to call `getUnreadCount`, which counts EVERYTHING — new ratings,
   * cancellations, attendance prompts. US-40 calls this badge the entire
   * retention mechanism for the poster persona, and answer Q6 `C` settled that
   * it counts one thing so the number means one thing. A badge that sometimes
   * means "someone wants to join" and sometimes "a rating arrived" is one
   * nobody can act on, and it sends people to the wrong screen. */
  const notificationService = useNotificationService();
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-requests', viewerId],
    queryFn: async () => {
      if (viewerId === null) return 0;
      const result = await notificationService.unreadRequestCount(viewerId);
      return result.ok ? result.value : 0;
    },
    enabled: viewerId !== null,
  });

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      {/* ================================================================== *
       * TOP BAR
       *
       * Three zones in reading order — which under RTL means the mark sits at
       * the right edge, where the eye enters. Search takes all the space left
       * over because finding something is what people came to do; everything
       * else is sized to its content.
       * ================================================================== */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a
            href="/"
            data-testid="app-shell-logo"
            className="flex items-center gap-2 text-brand touch-target"
            aria-label={t('app.name')}
          >
            <LogoMark className="size-7" />
            <span className="hidden text-lg font-bold text-text sm:inline">{t('app.name')}</span>
          </a>

          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-text-muted">
              <IconSearch />
            </span>
            <label htmlFor="app-search" className="sr-only-text">
              {t('nav.search')}
            </label>
            <input
              id="app-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              data-testid="app-shell-search"
              className="w-full touch-target rounded-full border border-border bg-surface-muted py-3 ps-10 pe-4 text-sm text-text placeholder:text-text-muted focus:border-brand focus:bg-surface"
            />
          </div>

          {/* Desktop nav. The bottom bar is the mobile pattern; carrying it to
           * a 1280px screen leaves a stranded strip of icons at the bottom. */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'relative rounded-full px-3 py-2 text-sm',
                    isActive ? 'bg-brand-subtle text-brand' : 'text-text-secondary hover:text-text',
                  ].join(' ')
                }
              >
                {t(item.key)}
                {item.to === '/requests' && unread > 0 ? (
                  <span className="absolute -top-1.5 -end-1.5">
                    <Badge variant="count" count={unread} />
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <CitySwitcher />

          <button
            type="button"
            onClick={toggle}
            // The label names the destination, not the current state: a control
            // says what happens when you use it.
            aria-label={resolved === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            title={resolved === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            data-testid="app-shell-theme-toggle"
            className="touch-target rounded-full px-2 text-lg text-text-secondary hover:bg-surface-sunken"
          >
            <span aria-hidden="true">{resolved === 'dark' ? '☀️' : '🌙'}</span>
          </button>
        </div>

      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 lg:pb-6">{children}</main>

      {/* ---- mobile bottom nav ------------------------------------------ */}
      <nav
        aria-label={t('nav.feed')}
        className="fixed bottom-0 start-0 end-0 z-20 flex border-t border-border bg-surface lg:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              [
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs touch-target',
                isActive ? 'text-brand' : 'text-text-muted',
              ].join(' ')
            }
          >
            {/* The badge is anchored to the ICON, not to the nav item's edge.
             *
             * Positioning it a fixed distance from the item's inline-end put it
             * adrift: the items are flex-1, so that offset lands in a different
             * place at every viewport width and the badge drifted over the
             * neighbouring «پروفایل». Hanging it off the icon's own box means it
             * hugs the icon no matter how wide the item gets.
             *
             * It lives on «درخواست‌ها» because, per personas.md, the unread count
             * is the product's ONLY retention mechanism — there are no push
             * notifications and no email — so it has to be prominent, not subtle. */}
            <span className="relative" aria-hidden="true">
              <span className="text-lg">{item.icon}</span>
              {item.to === '/requests' && unread > 0 ? (
                <span className="absolute -top-1.5 -end-3">
                  <Badge
                    variant="count"
                    count={unread}
                    data-testid="app-shell-nav-requests-badge"
                  />
                </span>
              ) : null}
            </span>
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

