import type { CityId, GeoPoint, LocationPrecision, NeighborhoodId } from '@core/domain';
import { t } from '@core/i18n';
import { areaOf } from '@core/rules/geo';
import { neighborhoodName } from '@core/reference/tehran';
import { MapCanvas } from './MapCanvas';

/* ===========================================================================
 * ⚠️ LocationPrecisionField — US-11, SAFETY-CRITICAL. BR-U3-10, BR-U3-11.
 *
 * TWO PICTURES, SIDE BY SIDE, NEITHER PRE-SELECTED.
 *
 * The functional design originally put the consequence in WORDS beside two
 * radios. The user supplied a screenshot of how Divar does it — a pin next to
 * a shaded circle — and that is better, so it is what is built. Words require
 * the reader to parse a sentence, in a second language, on a phone, while
 * doing something else. A pin next to a circle does not.
 *
 * Each preview renders THE POSTER'S OWN NEIGHBOURHOOD, not a generic
 * illustration. Someone deciding whether to publish their home address should
 * see what that decision produces for their address.
 *
 * `value` is `null` until chosen and publishing is refused until it is not.
 * A default of `exact` leaks by omission; a default of `neighborhood` quietly
 * overrides an intent the poster never expressed — which is a real cost for
 * the café owner who meant to publish an address. FR-11 says there is no
 * default for exactly this reason.
 * =========================================================================== */

export interface LocationPrecisionFieldProps {
  value: LocationPrecision | null;
  onChange: (precision: LocationPrecision) => void;
  neighborhoodId: NeighborhoodId | null;
  cityId: CityId;
  coordinate: GeoPoint | null;
  error?: string | undefined;
}

export function LocationPrecisionField({
  value,
  onChange,
  neighborhoodId,
  cityId,
  coordinate,
  error,
}: LocationPrecisionFieldProps) {
  const area = neighborhoodId === null ? undefined : areaOf(cityId, neighborhoodId ?? undefined);
  const label = neighborhoodId === null ? '' : (neighborhoodName(neighborhoodId) ?? '');
  const center = coordinate ?? area?.center ?? { lat: 35.6997, lng: 51.4015 };

  const optionClass = (selected: boolean) =>
    [
      'flex-1 min-w-0 rounded-[var(--radius-card)] border-2 p-2 text-start transition-colors',
      selected ? 'border-brand' : 'border-border hover:border-fg-muted',
    ].join(' ');

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-fg">{t('activity.precisionQuestion')}</legend>

      <div className="flex gap-3" role="radiogroup" aria-label={t('activity.precisionQuestion')}>
        {/* EXACT — a pin at the point. */}
        <button
          type="button"
          role="radio"
          aria-checked={value === 'exact'}
          onClick={() => onChange('exact')}
          className={optionClass(value === 'exact')}
          data-testid="precision-exact"
        >
          <MapCanvas
            center={center}
            spanDegrees={0.012}
            height={110}
            markers={coordinate === null ? [] : [{ id: 'preview', point: coordinate, label }]}
            areas={coordinate === null && area ? [{ id: 'p', area, label: '', count: 1 }] : []}
          />
          <p className="mt-2 text-sm font-medium text-fg">{t('activity.precisionExact')}</p>
          <p className="text-xs text-fg-muted">{t('activity.precisionExactHelp')}</p>
        </button>

        {/* APPROXIMATE — a circle over the neighborhood, and NO pin.
            The preview is the real thing: `areaOf` is the same function the
            projection uses, so what the poster sees here is exactly what a
            stranger will see. */}
        <button
          type="button"
          role="radio"
          aria-checked={value === 'neighborhood'}
          onClick={() => onChange('neighborhood')}
          className={optionClass(value === 'neighborhood')}
          data-testid="precision-neighborhood"
        >
          <MapCanvas
            center={area?.center ?? center}
            spanDegrees={0.03}
            height={110}
            areas={area === undefined ? [] : [{ id: 'preview', area, label, count: 1 }]}
          />
          <p className="mt-2 text-sm font-medium text-fg">{t('activity.precisionApprox')}</p>
          <p className="text-xs text-fg-muted">{t('activity.precisionApproxHelp')}</p>
        </button>
      </div>

      {error !== undefined && (
        <p role="alert" className="text-sm text-danger" data-testid="precision-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
