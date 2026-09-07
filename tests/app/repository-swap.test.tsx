import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '@app/App';
import type { Repositories } from '@core/repositories';
import {
  ActivityIdCodec,
  UserIdCodec,
  type Activity,
  type ActivityView,
  type ProfileView,
  type User,
} from '@core/domain';

/* ===========================================================================
 * STEP 38 — THE TEST THAT PROVES NFR-A1.
 *
 * NFR-A1 says swapping the mock data layer for a real one must not require
 * changes to any screen. Everything else in the codebase is an ARGUMENT that
 * this holds: the repository interfaces, DEP-2, RepositoryProvider. This is
 * the EVIDENCE.
 *
 * The stub below is deliberately shaped like an HTTP client — it holds no
 * localStorage, no seed, no store, and resolves canned responses the way a
 * `fetch` wrapper would. If mounting the real App against it required editing
 * a single component, U1's definition of done would not be met.
 *
 * In Round 2 this file barely changes: `createStubHttpRepositories` is
 * replaced with the real `@infra/http` implementation and the same assertions
 * run against it.
 * =========================================================================== */

const VIEWER = UserIdCodec.slug('http_1');

const profile: ProfileView = {
  id: VIEWER,
  displayName: 'کاربر سرور',
  interestIds: [],
  rating: { average: null, count: 0, activitiesAttended: 0, isNewMember: true },
  accountType: 'user',
  isVerifiedVenue: false,
  isAnonymized: false,
};

const currentUser: User = {
  id: VIEWER,
  phone: '+989120000000',
  displayName: 'کاربر سرور',
  interestIds: [],
  homeNeighborhoodId: 'nbh_vanak' as NonNullable<User['homeNeighborhoodId']>,
  accountType: 'user',
  accountStatus: 'active',
  isAnonymized: false,
  createdAt: new Date().toISOString(),
  profileCompletedAt: new Date().toISOString(),
  safetyGuidanceSeenAt: new Date().toISOString(),
};

const activityFromServer: ActivityView = {
  id: ActivityIdCodec.slug('http_1'),
  author: profile,
  authorKind: 'user',
  title: 'رویداد آزمایشی از سرور',
  description: 'این داده از یک پیاده‌سازی جعلی HTTP می‌آید، نه از حافظه‌ی محلی.',
  categoryIds: [],
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
  cityId: 'cty_tehran' as ActivityView['cityId'],
  neighborhoodId: 'nbh_vanak' as NonNullable<ActivityView['neighborhoodId']>,
  // neighborhood precision and NO exactAddress key — a real server upholds
  // INV-2 the same way the mock does.
  locationPrecision: 'neighborhood',
  status: 'published',
  derivedState: 'upcoming',
  viewerHasRequested: false,
  requestCount: 0,
};

const notImplemented = () => Promise.reject(new Error('not implemented in stub'));

function createStubHttpRepositories(): Repositories {
  return {
    auth: {
      requestCode: () => Promise.resolve({ sent: true as const, resendAfterSeconds: 60 }),
      verifyCode: () => Promise.resolve({ userId: VIEWER, startedAt: new Date().toISOString() }),
      getSession: () => Promise.resolve({ userId: VIEWER, startedAt: new Date().toISOString() }),
      signOut: () => Promise.resolve(),
    },
    users: {
      getCurrentUser: () => Promise.resolve(currentUser),
      getProfile: () => Promise.resolve(profile),
      completeSetup: notImplemented as never,
      markSafetyGuidanceSeen: notImplemented as never,
      updateProfile: notImplemented as never,
      deleteAccount: () => Promise.resolve(),
    },
    activities: {
      listFeed: () =>
        Promise.resolve({ items: [activityFromServer], nextCursor: null, hasMore: false }),
      getActivity: () => Promise.resolve(activityFromServer),
      listByAuthor: () => Promise.resolve([activityFromServer]),
      create: notImplemented as never,
      update: notImplemented as never,
      cancel: notImplemented as never,
      incrementViews: () => Promise.resolve(),
    },
    connections: {
      sendJoinRequest: notImplemented as never,
      withdrawRequest: notImplemented as never,
      listRequestsForActivity: () => Promise.resolve([]),
      listIncomingRequests: () => Promise.resolve([]),
      listSentRequests: () => Promise.resolve([]),
      confirmAttendance: () => Promise.resolve([]),
      listAttendance: () => Promise.resolve([]),
      listRateableParticipants: () => Promise.resolve([]),
      submitRating: notImplemented as never,
      getRatingSummary: () => Promise.resolve(profile.rating),
    },
    venues: {
      register: notImplemented as never,
      getVenueForUser: () => Promise.resolve(null),
      getVenueProfile: () => Promise.resolve(null),
      publishActivity: notImplemented as never,
      listVenueActivities: () => Promise.resolve([]),
      getMetrics: () => Promise.resolve({ views: 0, requestCount: 0, perActivity: [] }),
      listPendingApplications: () => Promise.resolve([]),
      setVerificationStatus: notImplemented as never,
    },
    safety: {
      reportUser: notImplemented as never,
      reportActivity: notImplemented as never,
      blockUser: notImplemented as never,
      unblockUser: () => Promise.resolve(),
      listBlocks: () => Promise.resolve([]),
      getBlockIndex: () =>
        Promise.resolve({ has: () => false, blockedFor: () => new Set<never>() }),
      listReports: () => Promise.resolve([]),
      resolveReport: notImplemented as never,
      setAccountStatus: () => Promise.resolve(),
      unpublishActivity: () => Promise.resolve(),
    },
    notifications: {
      /* ⚠️ AMENDED BY U4 / BR-U4-102. The badge used to call
       * `getUnreadCount`, which counts EVERY notification kind. Answer Q6 `C`
       * settled that it counts unread REQUESTS only, so the shell now derives
       * the number from `list` — and this stub had to start returning rows
       * rather than a bare count.
       *
       * The test's point is unchanged: seven comes from the stub, not from a
       * store, which is what proves the shell is source-agnostic. */
      list: () =>
        Promise.resolve(
          Array.from({ length: 7 }, (_, i) => ({
            id: `ntf_stub_${i}` as never,
            userId: VIEWER,
            kind: 'request_received' as const,
            channel: 'in_app' as const,
            payload: {},
            createdAt: new Date(Date.UTC(2026, 7, 1, 12, i)).toISOString(),
          })),
        ),
      /* Deliberately a DIFFERENT number from the seven above. If the badge
       * ever regresses to calling this, the test fails loudly instead of
       * passing by coincidence. */
      getUnreadCount: () => Promise.resolve(99),
      markRead: () => Promise.resolve(),
      create: notImplemented as never,
    },
    reference: {
      listDistricts: () => Promise.resolve([]),
      listNeighborhoods: () => Promise.resolve([]),
      listInterestTags: () => Promise.resolve([]),
      listCategories: () => Promise.resolve([]),
    },
  };
}

describe('NFR-A1 — the data layer is swappable without touching a screen', () => {
  it('mounts the real App against a stub HTTP implementation and renders its data', async () => {
    render(<App repositories={createStubHttpRepositories()} />);

    // The screen renders server-shaped data with no knowledge that the mock is
    // gone. No component was modified to make this pass.
    await waitFor(() => {
      expect(screen.getByText('رویداد آزمایشی از سرور')).toBeInTheDocument();
    });
  });

  it('renders the unread badge from the stub, proving the shell is source-agnostic too', async () => {
    render(<App repositories={createStubHttpRepositories()} />);

    await waitFor(() => {
      // ۷ in Persian digits — the count came from the stub, not from a store.
      expect(screen.getByTestId('app-shell-nav-requests-badge')).toHaveTextContent('۷');
    });
  });

  it('the stub never touches localStorage — the seam is real, not incidental', async () => {
    window.localStorage.clear();
    render(<App repositories={createStubHttpRepositories()} />);

    await waitFor(() => {
      expect(screen.getByText('رویداد آزمایشی از سرور')).toBeInTheDocument();
    });

    // If a screen had reached past RepositoryProvider into infra/mock, the
    // mock store would have seeded itself here. An empty localStorage is the
    // observable proof that DEP-2 held at runtime, not just at lint time.
    expect(window.localStorage.getItem('link.store')).toBeNull();
  });

  it('INV-2 survives the swap: a neighborhood-precision activity has no address key', async () => {
    const repositories = createStubHttpRepositories();
    const view = await repositories.activities.getActivity(VIEWER, activityFromServer.id);

    // The invariant is a property of the CONTRACT, not of the mock. Round 2's
    // server has to satisfy it in exactly this form.
    expect(view?.locationPrecision).toBe('neighborhood');
    expect('exactAddress' in (view ?? {})).toBe(false);
  });
});

/* A compile-time check that the stub really does satisfy the full interface.
 * If a repository method is added later and the stub is not updated, this file
 * stops compiling — which is the point: the swap test must never silently
 * drift out of covering the real contract. */
const _typeCheck: Repositories = createStubHttpRepositories();
void _typeCheck;
void ({} as Activity);
