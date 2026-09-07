import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, useSession, type SessionSnapshot } from '@app/SessionProvider';
import { t } from '@core/i18n';
import type { FieldErrors, SetupDraft } from '@core/rules/profileValidation';
import { Button } from '@ui/Button';
import { Skeleton } from '@ui/Skeleton';
import { ProfileFormFields } from './ProfileFormFields';
import { emptyDraft } from './profileDraft';
import { useIdentityServices } from './useIdentityServices';

/**
 * ProfileSetupScreen — US-02, frontend-components.md §6.
 *
 * One screen, not a wizard. Six fields is one screenful on a phone, and a
 * wizard adds navigation state plus three more places to abandon on the
 * surface with the highest drop-off risk in the product.
 */
export function ProfileSetupScreen() {
  const queryClient = useQueryClient();
  const { user, isLoading } = useSession();
  const { profile } = useIdentityServices();

  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setSubmitting] = useState(false);

  if (isLoading) return <Skeleton variant="card" lines={5} />;
  if (user === null) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (user === null) return;

    setSubmitting(true);
    const result = await profile.completeSetup(user.id, draft);
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      /* Focus the first invalid field. Errors render inline per field rather
         than as a summary, so without this the user on a long form is told
         something is wrong somewhere above them. */
      const first = Object.keys(result.errors)[0];
      if (first !== undefined) {
        document.querySelector<HTMLElement>(`[data-testid="profile-setup-${first}"]`)?.focus();
      }
      return;
    }

    setErrors({});
    /* Synchronous cache write before navigating — see SafetyGuidanceScreen for
     * why a refetch is not sufficient. */
    queryClient.setQueryData<SessionSnapshot>(SESSION_QUERY_KEY, (previous) =>
      previous === undefined ? previous : { ...previous, user: result.value },
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto flex w-full max-w-md flex-col gap-6 py-6"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">{t('profile.setupTitle')}</h1>
        <p className="text-sm text-fg-muted">{t('profile.setupSubtitle')}</p>
      </header>

      <ProfileFormFields
        draft={draft}
        onChange={setDraft}
        errors={errors}
        onClearError={(field) =>
          setErrors((previous) => {
            if (!(field in previous)) return previous;
            const next = { ...previous };
            delete next[field];
            return next;
          })
        }
      />

      {/* Enabled, and validates on press. A disabled submit with no
          explanation is the commonest accessibility failure in a signup form:
          the user cannot discover WHY it will not accept them. Pressing it
          surfaces every error at once, inline and in Persian. */}
      <Button type="submit" loading={isSubmitting} fullWidth data-testid="profile-setup-submit">
        {t('profile.setupSubmit')}
      </Button>
    </form>
  );
}
