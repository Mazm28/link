import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@app/SessionProvider';
import type { ActivityId } from '@core/domain';
import { t, tError } from '@core/i18n';
import type { ShareSelection } from '@core/rules/contactSharing';
import { Button } from '@ui/Button';
import { Sheet } from '@ui/Sheet';
import { TextArea } from '@ui/TextArea';
import { ContactShareSelector } from './ContactShareSelector';
import { DisclosureNotice } from './DisclosureNotice';
import { GuidanceLink } from '@features/safety';
import { useConnectionService } from './useConnectionServices';

/**
 * Every refusal `sendJoinRequest` can produce, mapped to the sentence that
 * explains it.
 *
 * The generic «مشکلی پیش آمد» would be a worse product here than anywhere
 * else in the app: each of these refusals is ACTIONABLE, and telling someone
 * "something went wrong" when the real answer is "you already requested this"
 * or "enter your Telegram ID" wastes the one moment they were willing to act.
 */
function joinErrorMessage(code: string): string {
  switch (code) {
    case 'duplicate_request':
      return t('join.errorDuplicate');
    case 'rerequest_exhausted':
      return t('join.errorRerequestExhausted');
    case 'activity_not_upcoming':
      return t('join.errorNotUpcoming');
    case 'daily_limit_reached':
      return t('join.errorDailyLimit');
    case 'no_phone_on_file':
      return t('join.errorNoPhone');
    case 'no_telegram_on_file':
      return t('join.errorNoTelegram');
    case 'invalid_telegram_format':
      return t('join.errorTelegramFormat');
    case 'sharing_required':
      return t('join.errorSharingRequired');
    default:
      return tError('state.error.message');
  }
}

/**
 * ⚠️ US-30 / US-31 — the moment a real person's contact detail reaches a
 * stranger. The most safety-sensitive screen in the product.
 *
 * ORDER IS A SAFETY PROPERTY, not a layout choice (business-logic-model.md §2):
 *
 *   note → selection → VALIDATION → DISCLOSURE → send
 *
 * Validation runs before the disclosure so nobody is told "this is sent
 * immediately and cannot be recalled" about a channel that then fails. The
 * disclosure sits before the send action, unscrollable and uncollapsible, so
 * nothing is disclosed before it has been read.
 *
 * ⚠️ The disclosure appears as soon as a selection is made and does not move,
 * hide, or animate away. See `DisclosureNotice` for why touching it re-opens
 * AR-02's risk acceptance.
 */
export function JoinRequestSheet({
  activityId,
  activityTitle,
  open,
  onClose,
}: {
  activityId: ActivityId;
  activityTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useSession();
  const service = useConnectionService();
  const queryClient = useQueryClient();

  /* ⚠️ `null`, not `'phone'`. BR-U4-12 — mandatory sharing is not a default
   * selection, and a pre-selected option turns a decision into a click. */
  const [selection, setSelection] = useState<ShareSelection | null>(null);
  const [telegramId, setTelegramId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  if (user === null) return null;

  const needsTelegramId = selection === 'telegram' && (user.telegramId ?? '') === '';

  async function submit() {
    if (user === null) return;
    if (selection === null) {
      setError(t('join.errorSharingRequired'));
      return;
    }

    setSubmitting(true);
    const result = await service.sendJoinRequest({
      requester: user,
      activityId,
      selection,
      ...(telegramId.trim() === '' ? {} : { providedTelegramId: telegramId.trim() }),
      ...(note.trim() === '' ? {} : { note: note.trim() }),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(joinErrorMessage(result.error.code));
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['requests'] });
    await queryClient.invalidateQueries({ queryKey: ['activity'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('join.title').replace('{{title}}', activityTitle)}
      data-testid="join-sheet"
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label={t('join.noteLabel')}
          value={note}
          onChange={setNote}
          rows={3}
          maxLength={300}
          data-testid="join-note"
        />

        <ContactShareSelector
          selection={selection}
          onSelectionChange={(value) => {
            setSelection(value);
            setError(undefined);
          }}
          telegramId={telegramId}
          onTelegramIdChange={setTelegramId}
          needsTelegramId={needsTelegramId}
          {...(error === undefined ? {} : { error })}
        />

        {/* ⚠️ BR-U4-21 — adjacent to the send action, never collapsed, never
            below the fold. It renders as soon as a selection exists, because
            that is the moment there is something to disclose. */}
        {selection !== null && <DisclosureNotice />}

        {/* ⚠️ US-73 criterion 4, via U6 (BR-U6-50/51).
            AFTER both disclosure lines and OUTSIDE the notice box. Putting it
            inside, or above as "read this first", is what WEAKENS the
            disclosure — and stories.md says a weakened disclosure invalidates
            AR-02's acceptance. It is not a dismiss control. */}
        {selection !== null && <GuidanceLink />}

        <div className="flex items-center gap-3">
          <Button
            onClick={() => void submit()}
            /* Disabled until a choice is made — the send action cannot be the
               thing that picks a channel on someone's behalf. */
            disabled={selection === null || submitting}
            data-testid="join-submit"
          >
            {t('join.submit')}
          </Button>

          {/* CR-07 Q2 `B` — a visible way out. With sharing now mandatory the
              choice is "share or do not join", and a sheet with no exit would
              make that a dead end the person has to infer. */}
          <Button variant="ghost" onClick={onClose} data-testid="join-cancel">
            {t('join.cancel')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
