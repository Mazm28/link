import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, useSession, type SessionSnapshot } from '@app/SessionProvider';
import { t } from '@core/i18n';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { useIdentityServices } from './useIdentityServices';

/**
 * SafetyGuidanceScreen — US-73, frontend-components.md §11.
 *
 * THIS IS NOT BOILERPLATE. AR-01 accepted that there is no age restriction and
 * AR-02 accepted that there is no approval gate before contact details reach a
 * stranger. This screen is the compensating control for both — the only place
 * the product says out loud what it does not verify.
 *
 * The copy is written to be understood by a young reader (BR-U2-54): short
 * sentences, concrete advice, no legal register. Given AR-01, minors are not
 * prevented from registering, so guidance they cannot parse is guidance that
 * does not exist.
 */
export function SafetyGuidanceScreen({ variant }: { variant: 'onboarding' | 'reference' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { profile } = useIdentityServices();
  const [isSaving, setSaving] = useState(false);

  async function acknowledge() {
    if (user === null) return;
    setSaving(true);
    const result = await profile.markSafetyGuidanceSeen(user.id);
    setSaving(false);
    if (!result.ok) return;

    /* Write the response we already hold, synchronously.
     *
     * Neither `invalidateQueries` nor `refetchQueries` is enough here: both
     * resolve before React has re-rendered SessionProvider, so the navigation
     * on the next line still routes on the OLD user. `OnboardingGate` then
     * sees the guidance as unseen, redirects straight back to this screen, and
     * pressing «خواندم» appears to do nothing at all. The gate only ever
     * redirects — nothing un-redirects it once the fresh data lands.
     *
     * `setQueryData` is synchronous and uses the authoritative record the
     * repository just returned, so the gate cannot disagree. */
    queryClient.setQueryData<SessionSnapshot>(SESSION_QUERY_KEY, (previous) =>
      previous === undefined ? previous : { ...previous, user: result.value },
    );
  }

  const sections = [
    { title: t('safety.s1Title'), body: t('safety.s1Body') },
    { title: t('safety.s2Title'), body: t('safety.s2Body') },
    { title: t('safety.s3Title'), body: t('safety.s3Body') },
    { title: t('safety.s4Title'), body: t('safety.s4Body') },
  ];

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-fg">{t('safety.title')}</h1>
        <p className="text-sm text-fg-muted">{t('safety.lead')}</p>
      </header>

      {sections.map((section, index) => (
        <Card key={section.title} data-testid={`safety-guidance-section-${index + 1}`}>
          <h2 className="mb-1 text-base font-semibold text-fg">{section.title}</h2>
          <p className="text-sm leading-7 text-fg-muted">{section.body}</p>
        </Card>
      ))}

      {variant === 'onboarding' ? (
        <>
          {/* BR-U2-55 — an explicit press, not a timer and not scroll-to-bottom.
              Both of those record that a screen was displayed; only a press
              records that a person decided they were done with it. */}
          <Button
            onClick={() => void acknowledge()}
            loading={isSaving}
            fullWidth
            data-testid="safety-guidance-acknowledge"
          >
            {t('safety.acknowledge')}
          </Button>
          <p className="text-center text-xs text-fg-muted">{t('safety.readAnytime')}</p>
        </>
      ) : (
        <Button variant="secondary" onClick={() => void navigate(-1)} fullWidth>
          {t('action.back')}
        </Button>
      )}
    </section>
  );
}
