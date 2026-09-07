import type { CityId, GeoPoint, NeighborhoodId } from '@core/domain';
import { t } from '@core/i18n';
import { areaOf } from '@core/rules/geo';
import { Button } from '@ui/Button';
import { MapCanvas } from './MapCanvas';

/**
 * LocationPicker — BR-U3-94.
 *
 * OPTIONAL. An activity with no point still publishes, and still appears on
 * the map as its neighborhood area. Requiring a map interaction to post would
 * turn the map from a feature into a gate.
 */
export function LocationPicker({
  value,
  onChange,
  neighborhoodId,
  cityId,
}: {
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
  neighborhoodId: NeighborhoodId | null;
  cityId: CityId;
}) {
  const area = areaOf(cityId, neighborhoodId ?? undefined);
  /* Opens centred on the chosen neighborhood, so the first interaction is an
   * adjustment rather than a search across a city. */
  const center = value ?? area?.center ?? { lat: 35.6997, lng: 51.4015 };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-fg">{t('activity.pickOnMap')}</span>
      <p className="text-xs text-fg-muted">{t('activity.pickOnMapHint')}</p>

      <MapCanvas
        center={center}
        spanDegrees={0.02}
        markers={value === null ? [] : [{ id: 'picked', point: value, label: '' }]}
        onMapClick={onChange}
        height={240}
        data-testid="location-picker"
      />

      {value !== null && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          data-testid="location-clear"
        >
          {t('activity.clearPoint')}
        </Button>
      )}
    </div>
  );
}
