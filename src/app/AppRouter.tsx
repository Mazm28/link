import { Navigate, Route, Routes } from 'react-router-dom';
import {
  AccountDeletionFlow,
  ProfileEditScreen,
  SafetyGuidanceScreen,
} from '@features/identity';
import {
  ActivityComposerScreen,
  ActivityDetailScreen,
  CategoryBrowseScreen,
  FeedScreen,
  MyActivitiesScreen,
  SearchScreen,
} from '@features/activities';
import { AppShell } from './AppShell';
import { OnboardingGate } from './OnboardingGate';
import { FoundationDemo } from './routes/FoundationDemo';

/**
 * Routing — U2, frontend-components.md §2.
 *
 * Two groups, and the split matters:
 *
 *   AUTH and ONBOARDING have NO routes at all. `OnboardingGate` renders
 *               sign-in, profile setup, and safety guidance itself, so a step
 *               can never fall out of step with the session that decides it —
 *               and no part of the identity flow appears in the URL.
 *   SAFETY      outside the gate deliberately. US-73 requires the guidance to
 *               be reachable "at any time", and the least useful moment to
 *               make it conditional is while someone is still deciding whether
 *               to trust the product at all.
 *
 * Everything else sits behind `OnboardingGate`. U3–U6 mount there; U5 adds the
 * `/venue/*` branch behind `RoleGuard` inside it.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/safety-guidance" element={<SafetyGuidanceScreen variant="reference" />} />

      <Route
        path="*"
        element={
          <OnboardingGate>
            <AppShell>
              <Routes>
                <Route path="/" element={<FeedScreen />} />
                <Route path="/search" element={<SearchScreen />} />
                <Route path="/categories" element={<CategoryBrowseScreen />} />
                <Route path="/create" element={<ActivityComposerScreen />} />
                <Route path="/activity/:id" element={<ActivityDetailScreen />} />
                <Route path="/my-activities" element={<MyActivitiesScreen />} />
                <Route path="/profile" element={<ProfileEditScreen />} />
                <Route path="/profile/delete" element={<AccountDeletionFlow />} />
                {/* U1's demo, kept behind an explicit path. It is the only
                    surface exercising a few U1 primitives, and its tests are
                    still the ones that cover them. */}
                <Route path="/foundation-demo" element={<FoundationDemo />} />
                {/* U4 replaces this. */}
                <Route path="/requests" element={<FoundationDemo />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </OnboardingGate>
        }
      />
    </Routes>
  );
}
