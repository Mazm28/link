import { useMemo, useState } from 'react';
import type { CityId } from '@core/domain';
import { t } from '@core/i18n';
import { normalizePersian } from '@core/rules/persianText';
import { IRAN_CITIES, cityName } from '@core/reference/cities';
import { Button } from '@ui/Button';
import { Chip } from '@ui/Chip';
import { Input } from '@ui/Input';
import { Sheet } from '@ui/Sheet';

/**
 * CitySelector — CR-02 item 4.
 *
 * Replaces `NeighborhoodSelector` on the profile. Optional: «هیچ‌کدام» is a
 * real choice rather than the absence of one, so leaving it unset reads as a
 * decision instead of an unfinished field.
 *
 * Like the neighborhood picker, THIS NEVER REQUESTS DEVICE LOCATION (CQ8 `B`).
 * The list is searchable with the same Persian normalization the rest of the
 * product uses, so «اصفهاן» typed with an Arabic heh still finds «اصفهان».
 */
export interface CitySelectorProps {
  value: CityId | null;
  onChange: (id: CityId | null) => void;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

export function CitySelector({ value, onChange, label, hint, error }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const needle = normalizePersian(query);
    if (needle === '') return IRAN_CITIES;
    return IRAN_CITIES.filter((city) => normalizePersian(city.nameFa).includes(needle));
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-fg">{label}</span>

      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="city-selector-trigger">
        {value === null ? t('profile.cityChoose') : (cityName(value) ?? t('profile.cityChoose'))}
      </Button>

      {hint !== undefined && <p className="text-xs text-fg-muted">{hint}</p>}
      {error !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="flex flex-col gap-4">
          <Input
            value={query}
            onChange={setQuery}
            label={t('profile.citySearch')}
            data-testid="city-selector-search"
          />

          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">{t('profile.cityEmpty')}</p>
          ) : (
            <div className="flex max-h-[60vh] flex-wrap gap-2 overflow-y-auto">
              {/* Explicitly clearable — "I would rather not say" is an answer. */}
              <Chip
                label={t('profile.cityNone')}
                selected={value === null}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                data-testid="city-selector-option-none"
              />
              {matches.map((city) => (
                <Chip
                  key={city.id}
                  label={city.nameFa}
                  selected={value === city.id}
                  onClick={() => {
                    onChange(value === city.id ? null : city.id);
                    setOpen(false);
                  }}
                  data-testid={`city-selector-option-${city.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
