import { useState } from 'react';
import { t } from '@core/i18n';
import { Button } from '@ui/Button';
import { Chip } from '@ui/Chip';
import { Sheet } from '@ui/Sheet';
import { useCity } from './CityProvider';

/**
 * CitySwitcher — BR-U3-51.
 *
 * Switching the browsing city does NOT write to the profile. The same
 * separation US-21 already requires for the neighborhood filter: looking
 * elsewhere for an evening should not silently rewrite where you say you live.
 */
export function CitySwitcher() {
  const { cityId, setCityId, cityName, cities } = useCity();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} data-testid="city-switcher">
        {cityName}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('city.switch')}>
        {/* Bounded and scrollable. Twenty-five chips in an unbounded wrapping
          * row overflowed the sheet upward — the container's bottom edge sat
          * above the viewport, so most of the list was unreachable and it
          * looked as though only a handful of cities existed. */}
        <div className="flex max-h-[60vh] flex-wrap gap-2 overflow-y-auto">
          {cities.map((city) => (
            <Chip
              key={city.id}
              label={city.nameFa}
              selected={city.id === cityId}
              onClick={() => {
                setCityId(city.id);
                setOpen(false);
              }}
              data-testid={`city-option-${city.id}`}
            />
          ))}
        </div>
      </Sheet>
    </>
  );
}
