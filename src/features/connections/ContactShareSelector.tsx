import { t } from '@core/i18n';
import type { ShareSelection } from '@core/rules/contactSharing';
import { Input } from '@ui/Input';
import { RadioGroup } from '@ui/RadioGroup';

/**
 * ⚠️ US-30, BR-U4-10…15 — what the requester chooses to disclose.
 *
 * ⚠️ NOTHING IS PRE-SELECTED, and this is the distinction CR-07 makes easy to
 * lose. Sharing is now MANDATORY, but mandatory sharing is not a default
 * SELECTION: the person must still pick which detail leaves their control.
 * Pre-selecting "phone" because it is always available would turn a decision
 * into a click-through, which is exactly what US-30's second criterion exists
 * to prevent.
 *
 * `RadioGroup` takes `value: string | null` for this reason — U1 built the
 * primitive with an explicit unselected state so this screen could not fake one.
 *
 * ⚠️ NO FALLBACK. If Telegram is chosen and none is stored, an inline field
 * appears. The alternative — silently sending the phone number instead — would
 * disclose something the person deliberately did not choose, and is the single
 * worst thing this flow could do (BR-U4-13).
 */
export function ContactShareSelector({
  selection,
  onSelectionChange,
  telegramId,
  onTelegramIdChange,
  needsTelegramId,
  error,
}: {
  selection: ShareSelection | null;
  onSelectionChange: (value: ShareSelection) => void;
  telegramId: string;
  onTelegramIdChange: (value: string) => void;
  /** True when Telegram is selected and the profile has none on file. */
  needsTelegramId: boolean;
  error?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        legend={t('join.shareQuestion')}
        /* `null` until chosen — never a default. */
        value={selection}
        onChange={(value) => onSelectionChange(value as ShareSelection)}
        options={[
          { value: 'phone', label: t('join.sharePhone') },
          { value: 'telegram', label: t('join.shareTelegram') },
        ]}
        {...(error === undefined ? {} : { error })}
        data-testid="share-selector"
      />

      {needsTelegramId && (
        <div className="flex flex-col gap-1">
          <Input
            label={t('join.telegramPrompt')}
            value={telegramId}
            onChange={onTelegramIdChange}
            dir="ltr"
            data-testid="join-telegram-input"
          />
          {/* BR-U4-14 — said out loud. Sharing a handle with one host is not a
              decision to publish it on a profile everyone can see. */}
          <p className="text-xs text-fg-muted">{t('join.telegramHint')}</p>
        </div>
      )}
    </div>
  );
}
