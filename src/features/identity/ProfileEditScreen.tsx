import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, useSession, type SessionSnapshot } from '@app/SessionProvider';
import { t } from '@core/i18n';
import type { FieldErrors, SetupDraft } from '@core/rules/profileValidation';
import { buildProfilePatch } from '@core/rules/profileValidation';
import { Button } from '@ui/Button';
import { Dialog } from '@ui/Dialog';
import { ErrorState } from '@ui/ErrorState';
import { Skeleton } from '@ui/Skeleton';
import { Toast } from '@ui/Toast';
import { ProfileFormFields } from './ProfileFormFields';
import { draftFrom } from './profileDraft';
import { useIdentityServices } from './useIdentityServices';

/**
 * ProfileEditScreen — US-03, frontend-components.md §9.
 *
 * The phone number does not appear here either. There is no field for it and
 * no read-only display of it: changing a number needs re-verification, which
 * is Round 2, and showing it would violate FR-02 for no benefit.
 */
export function ProfileEditScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useSession();
  const { profile, auth } = useIdentityServices();

  const original = useMemo(() => (user === null ? null : draftFrom(user)), [user]);
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (isLoading) return <Skeleton variant="card" lines={5} />;
  if (user === null || original === null)
    return <ErrorState title={t('state.error.title')} message={t('state.error.message')} />;

  const current = draft ?? original;
  const patch = buildProfilePatch(user, current);
  const isDirty = Object.keys(patch).length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (user === null) return;

    setSubmitting(true);
    /* The patch carries ONLY changed keys (P-U2-02). Sending the whole form
     * works fine against a mock and then quietly overwrites whatever a second
     * device changed, the moment there is a real backend. */
    const result = await profile.updateProfile(user, patch);
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSaved(true);
    setDraft(null);

    /* US-03 — a name change must appear on already-published activities.
     * The STORE is already correct: activities hold `authorId`, not a copy of
     * the name, so the change is visible on the next read. What needs doing is
     * invalidation — the feed and activity caches hold rendered author names,
     * and without this the user sees their old name on their own activity and
     * concludes the save failed. */
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    await queryClient.invalidateQueries({ queryKey: ['feed'] });
    await queryClient.invalidateQueries({ queryKey: ['activity'] });
  }

  function leave() {
    if (isDirty) {
      setConfirmLeave(true);
      return;
    }
    void navigate('/profile');
  }

  async function signOut() {
    await auth.signOut();

    /* ORDER MATTERS, and it is not the obvious one.
     *
     * `queryClient.clear()` first, then `setQueryData`, does NOT work:
     * `clear()` removes the query the session observer is bound to, and the
     * value written afterwards lands on a NEW query object the orphaned
     * observer is not watching. The gate then keeps rendering the signed-in
     * app until something forces a remount — pressing «خروج از حساب» appears
     * to do nothing until the page is reloaded.
     *
     * So: publish the signed-out session FIRST, on the query that is still
     * being observed, then drop everything else. A signed-out browser must not
     * keep a page of somebody's feed in memory, but it must also actually
     * notice that it is signed out. */
    queryClient.setQueryData<SessionSnapshot>(SESSION_QUERY_KEY, { session: null, user: null });
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
    });
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto flex w-full max-w-md flex-col gap-6 py-6"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">{t('profile.editTitle')}</h1>
        <Button variant="ghost" onClick={leave}>
          {t('action.back')}
        </Button>
      </header>

      <ProfileFormFields
        draft={current}
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

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={!isDirty}
        fullWidth
        data-testid="profile-edit-save"
      >
        {t('profile.editSave')}
      </Button>

      <nav className="flex flex-col gap-2 border-t border-border pt-4">
        <Link to="/safety-guidance" className="text-sm text-brand underline">
          {t('profile.menuSafety')}
        </Link>
        <Button variant="ghost" onClick={() => void signOut()}>
          {t('profile.signOut')}
        </Button>
      </nav>

      {/* Visually separated and de-emphasised. An irreversible action should
          not sit next to "save" wearing the same clothes. */}
      <div className="mt-4 border-t border-border pt-4">
        <Link
          to="/profile/delete"
          className="text-sm text-danger underline"
          data-testid="profile-edit-delete-entry"
        >
          {t('delete.entry')}
        </Link>
      </div>

      <Dialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => void navigate('/')}
        title={t('profile.editDiscardTitle')}
        message={t('profile.editDiscardBody')}
        confirmLabel={t('profile.editDiscardConfirm')}
        cancelLabel={t('profile.editDiscardCancel')}
        confirmVariant="danger"
        data-testid="profile-edit-dirty-dialog"
      />

      {saved && <Toast message={t('profile.editSaved')} onDismiss={() => setSaved(false)} />}
    </form>
  );
}
