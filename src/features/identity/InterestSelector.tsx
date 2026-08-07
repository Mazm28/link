import type { InterestTagId } from '@core/domain';
import { t } from '@core/i18n';
import { toPersianDigits } from '@core/rules/persianText';
import { INTEREST_TAGS } from '@core/reference/taxonomy';
import { Chip } from '@ui/Chip';

/* ===========================================================================
 * InterestSelector — frontend-components.md §8
 *
 * Also built for U3 reuse (US-22): `min` drops to 0 in a filter panel, where
 * "no interest selected" means "do not filter" rather than "invalid".
 * =========================================================================== */

export interface InterestSelectorProps {
  value: readonly InterestTagId[];
  onChange: (ids: InterestTagId[]) => void;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** 1 at setup (US-02); 0 in U3's filters. */
  min?: number;
  /** BR-U2-24 — 10. */
  max?: number;
}

export function InterestSelector({
  value,
  onChange,
  label,
  hint,
  error,
  max = 10,
}: InterestSelectorProps) {
  const atMax = value.length >= max;

  function toggle(id: InterestTagId) {
    if (value.includes(id)) {
      onChange(value.filter((existing) => existing !== id));
      return;
    }
    if (atMax) return;
    onChange([...value, id]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-fg">{label}</legend>

      {hint !== undefined && <p className="text-xs text-fg-muted">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {INTEREST_TAGS.map((tag) => {
          const selected = value.includes(tag.id);
          const blocked = atMax && !selected;

          /* At the cap, an unselected chip is visibly dimmed and marked
             aria-disabled rather than left looking tappable. `toggle` also
             refuses, so the state is enforced and not merely styled — but the
             dimming is the part that stops someone tapping the same chip four
             times wondering why nothing happens. */
          return (
            <span
              key={tag.id}
              aria-disabled={blocked}
              className={blocked ? 'opacity-40' : undefined}
            >
              <Chip
                label={tag.nameFa}
                icon={tag.icon}
                selected={selected}
                onClick={() => toggle(tag.id)}
                data-testid={`interest-selector-chip-${tag.id}`}
              />
            </span>
          );
        })}
      </div>

      <p className="text-xs text-fg-muted" data-testid="interest-selector-count">
        {t('profile.interestsCount', {
          selected: toPersianDigits(value.length),
          max: toPersianDigits(max),
        })}
      </p>

      {/* BR-U2-24 — at the cap, say so. A chip that silently ignores a tap
          reads as a broken control, and the user's next move is to tap it
          harder rather than to remove one. */}
      {atMax && <p className="text-xs text-fg-muted">{t('profile.interestsAtMax')}</p>}

      {error !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
