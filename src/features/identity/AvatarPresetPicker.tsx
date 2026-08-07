import type { AvatarPresetId } from '@core/domain';
import { t } from '@core/i18n';
import { AVATAR_PRESETS } from '@core/reference/avatars';
import { Avatar } from '@ui/Avatar';

/**
 * AvatarPresetPicker — frontend-components.md §6.1.
 *
 * Radio semantics: exactly one selection, and "initials" is a real option
 * rather than the absence of one. Making "no picture" an explicit choice is
 * what stops it reading as an unfinished field.
 */
export interface AvatarPresetPickerProps {
  value: AvatarPresetId | null;
  onChange: (id: AvatarPresetId | null) => void;
  /** For the initials preview — shows the user their own fallback. */
  name: string;
  label: string;
}

export function AvatarPresetPicker({ value, onChange, name, label }: AvatarPresetPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-fg">{label}</legend>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label={t('profile.avatarNone')}
          onClick={() => onChange(null)}
          className={`rounded-full p-0.5 ${value === null ? 'ring-2 ring-brand' : ''}`}
          data-testid="avatar-preset-none"
        >
          <Avatar name={name === '' ? t('profile.avatarNoName') : name} size="lg" />
        </button>

        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={value === preset.id}
            aria-label={preset.labelFa}
            onClick={() => onChange(preset.id)}
            className={`rounded-full p-0.5 ${value === preset.id ? 'ring-2 ring-brand' : ''}`}
            data-testid={`avatar-preset-${preset.id}`}
          >
            <Avatar name={preset.labelFa} preset={preset.id} size="lg" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
