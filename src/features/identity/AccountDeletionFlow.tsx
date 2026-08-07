import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, useSession, type SessionSnapshot } from '@app/SessionProvider';
import { t, tError } from '@core/i18n';
import { Button } from '@ui/Button';
import { Input } from '@ui/Input';
import { Modal } from '@ui/Modal';
import { Skeleton } from '@ui/Skeleton';
import { useIdentityServices } from './useIdentityServices';

/**
 * AccountDeletionFlow — US-03, frontend-components.md §10.
 *
 * Two steps for an action nothing can undo. Round 1 has no backend, no backup,
 * and no job runner, so there is no restore path and no grace period that
 * would be anything but a lie in the copy.
 */
export function AccountDeletionFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useSession();
  const { profile } = useIdentityServices();

  const [step, setStep] = useState<'consequences' | 'confirm'>('consequences');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setDeleting] = useState(false);

  if (isLoading) return <Skeleton variant="card" lines={5} />;
  if (user === null) return null;

  const confirmWord = t('delete.confirmWord');

  async function remove() {
    if (user === null) return;

    setError(null);
    setDeleting(true);
    const result = await profile.deleteAccount(user.id, typed, confirmWord);
    setDeleting(false);

    if (!result.ok) {
      setError(tError(result.error.messageKey));
      return;
    }

    /* The WHOLE cache, not selected keys. A deleted account's data can sit in
     * any cached response — a feed page, an activity detail, a request list —
     * and enumerating them produces a list that goes stale the next time a
     * unit adds a query. Dropping everything is one line and cannot be
     * incomplete. */
    /* Publish the signed-out session on the query the observer is still bound
     * to, THEN drop the rest. Clearing first would orphan that observer and
     * the gate would keep rendering the deleted user's app — see
     * ProfileEditScreen.signOut for the full version of this. */
    queryClient.setQueryData<SessionSnapshot>(SESSION_QUERY_KEY, { session: null, user: null });
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5 py-8">
      <h1 className="text-xl font-semibold text-fg">{t('delete.title')}</h1>
      <p className="text-sm text-fg-muted">{t('delete.lead')}</p>

      {/* BR-U2-45 — the consequences in plain Persian. This is also the only
          place the anonymize-not-erase behaviour becomes visible to the person
          it affects; leaving it in the code would make it a surprise. */}
      <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-fg" data-testid="deletion-consequences">
        <li>{t('delete.point1')}</li>
        <li>{t('delete.point2')}</li>
        <li>{t('delete.point3')}</li>
        <li>{t('delete.point4')}</li>
        <li className="font-semibold text-danger">{t('delete.point5')}</li>
      </ul>

      <div className="flex gap-3">
        {/* Cancel first and visually primary. For an irreversible action the
            safe option is the one a stray tap or Enter should land on. */}
        <Button variant="secondary" onClick={() => void navigate('/profile')} data-testid="deletion-cancel">
          {t('delete.cancel')}
        </Button>
        <Button variant="danger" onClick={() => setStep('confirm')} data-testid="deletion-continue">
          {t('delete.continue')}
        </Button>
      </div>

      <Modal
        open={step === 'confirm'}
        onClose={() => setStep('consequences')}
        title={t('delete.confirmTitle')}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg">{t('delete.confirmBody')}</p>

          <Input
            value={typed}
            onChange={setTyped}
            label={t('delete.confirmLabel')}
            error={error ?? undefined}
            data-testid="deletion-confirm-input"
          />

          {/* Disabled is CORRECT here, unlike on the setup form: the
              requirement is stated in full one line above the button, so the
              user can always see why it will not accept them yet. */}
          <Button
            variant="danger"
            loading={isDeleting}
            disabled={typed.trim() !== confirmWord}
            onClick={() => void remove()}
            fullWidth
            data-testid="deletion-confirm-submit"
          >
            {t('delete.confirmSubmit')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
