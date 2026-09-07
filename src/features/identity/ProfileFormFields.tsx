import type { CityId, InterestTagId } from '@core/domain';
import { t, tError } from '@core/i18n';
import { toPersianDigits, countCodePoints } from '@core/rules/persianText';
import {
  BIO_MAX,
  NAME_MAX,
  type FieldErrors,
  type SetupDraft,
} from '@core/rules/profileValidation';
import { Input } from '@ui/Input';
import { TextArea } from '@ui/TextArea';
import { AvatarPresetPicker } from './AvatarPresetPicker';
import { CitySelector, InterestSelector } from '@features/reference';

/**
 * The six profile fields, shared by setup (US-02) and edit (US-03).
 *
 * One component rather than two nearly-identical forms: the fields, their
 * validation, and their Persian copy are the same in both places, and the only
 * genuine difference is what the submit button does. Two copies would drift,
 * and the field that drifts is always the one with the privacy label on it.
 */
export interface ProfileFormFieldsProps {
  draft: SetupDraft;
  onChange: (next: SetupDraft) => void;
  errors: FieldErrors;
  /** Clears one field's error. See the note in `set` below. */
  onClearError: (field: string) => void;
}

export function ProfileFormFields({
  draft,
  onChange,
  errors,
  onClearError,
}: ProfileFormFieldsProps) {
  /**
   * Editing a field CLEARS that field's error.
   *
   * Without this, errors only recomputed on submit, so a message stayed on
   * screen after the user had already fixed the field — someone types a
   * perfectly good «محمد علی» and is still told their name must be 2–40
   * characters. The value was valid the whole time; the message was stale, and
   * from the outside those two are indistinguishable.
   *
   * Only the edited field is cleared. Wiping every error on any keystroke
   * would hide the problems the user has not reached yet.
   */
  const set = <K extends keyof SetupDraft>(key: K, value: SetupDraft[K]) => {
    onClearError(key);
    onChange({ ...draft, [key]: value });
  };

  const errorFor = (field: string) => {
    const error = errors[field];
    return error === undefined ? undefined : tError(error.messageKey);
  };

  return (
    <>
      <Input
        value={draft.displayName}
        onChange={(value) => set('displayName', value)}
        label={t('profile.nameLabel')}
        placeholder={t('profile.namePlaceholder')}
        maxLength={NAME_MAX}
        error={errorFor('displayName')}
        data-testid="profile-setup-name"
      />

      <AvatarPresetPicker
        value={draft.avatarId ?? null}
        onChange={(id) => {
          onClearError('avatarId');
          onChange({ ...draft, ...(id === null ? { avatarId: undefined } : { avatarId: id }) });
        }}
        name={draft.displayName}
        label={t('profile.avatarLabel')}
      />

      <TextArea
        value={draft.bio}
        onChange={(value) => set('bio', value)}
        label={t('profile.bioLabel')}
        placeholder={t('profile.bioPlaceholder')}
        rows={3}
        maxLength={BIO_MAX}
        hint={t('profile.bioCounter', { count: toPersianDigits(countCodePoints(draft.bio)) })}
        error={errorFor('bio')}
        data-testid="profile-setup-bio"
      />

      <InterestSelector
        value={draft.interestIds}
        onChange={(ids: InterestTagId[]) => set('interestIds', ids)}
        label={t('profile.interestsLabel')}
        /* CR-02 item 2 — optional, and the hint says so rather than leaving
           people to discover it by pressing the button. */
        hint={t('profile.interestsHintOptional')}
        error={errorFor('interestIds')}
      />

      <CitySelector
        value={draft.homeCityId}
        onChange={(id: CityId | null) => set('homeCityId', id)}
        label={t('profile.cityLabel')}
        /* CQ8 `B` — stated on the screen, not just in the code. A user deciding
           whether to hand over their city deserves to know the app is not also
           reading their location. */
        hint={t('profile.cityHint')}
        error={errorFor('homeCityId')}
      />

      <Input
        value={draft.telegramId}
        onChange={(value) => set('telegramId', value)}
        label={t('profile.telegramLabel')}
        dir="ltr"
        /* BR-U2-63 — the privacy statement sits ON the field, not in a help
           page. This is the moment someone decides whether to enter it. */
        hint={t('profile.telegramPrivacy')}
        error={errorFor('telegramId')}
        data-testid="profile-setup-telegram"
      />
    </>
  );
}
