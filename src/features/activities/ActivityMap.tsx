import { useMemo } from 'react';
import type { ActivityView, GeoPoint } from '@core/domain';
import { t } from '@core/i18n';
import { toPersianDigits } from '@core/rules/persianText';
import { cityName } from '@core/reference/cities';
import { neighborhoodName } from '@core/reference/neighborhoods';
import { MapCanvas, type MapAreaMarker, type MapMarker } from './MapCanvas';

/**
 * ActivityMap — BR-U3-90 … 93.
 *
 * Shows the CURRENT FILTERED SET. It is a view of the feed, not a second
 * query, so whatever the filters exclude is absent here too.
 *
 * The component cannot draw a pin for an approximate activity, because it is
 * never given a coordinate for one — `coordinate` is simply absent on those
 * views (INV-5). That is not a rule this file follows; it is the shape of its
 * input.
 */
export function ActivityMap({
  activities,
  center,
  onSelect,
  /* The feed's map view wants the room; the detail page's inset does not, and
   * forcing both to one size made the detail page scroll for a map showing a
   * single activity. */
  height = 420,
}: {
  activities: readonly ActivityView[];
  center: GeoPoint;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const { markers, areas } = useMemo(() => {
    const pins: MapMarker[] = [];
    /* BR-U3-92 — one circle per neighborhood, with a count. Drawing eight
     * identical overlapping circles would suggest eight distinct places, which
     * is the opposite of what an approximate area means. */
    const byNeighborhood = new Map<string, MapAreaMarker>();

    for (const a of activities) {
      if (a.coordinate !== undefined) {
        pins.push({ id: a.id as string, point: a.coordinate, label: a.title });
        continue;
      }
      if (a.approximateArea === undefined) continue;

      const key = a.neighborhoodId as string;
      const existing = byNeighborhood.get(key);
      if (existing) {
        existing.count += 1;
        existing.label = t('map.areaCount', { count: toPersianDigits(existing.count) });
      } else {
        byNeighborhood.set(key, {
          id: key,
          area: a.approximateArea,
          label:
            (a.neighborhoodId === undefined
              ? cityName(a.cityId)
              : neighborhoodName(a.neighborhoodId)) ?? '',
          count: 1,
        });
      }
    }

    return { markers: pins, areas: [...byNeighborhood.values()] };
  }, [activities]);

  return (
    <div className="flex flex-col gap-2">
      <MapCanvas
        center={center}
        spanDegrees={0.09}
        markers={markers}
        areas={areas}
        {...(onSelect === undefined ? {} : { onMarkerClick: onSelect })}
        height={height}
        data-testid="activity-map"
      />

      <div className="flex flex-wrap gap-4 text-xs text-fg-muted" data-testid="map-legend">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-brand" aria-hidden="true" />
          {t('map.legendExact')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-full border border-brand bg-brand/20"
            aria-hidden="true"
          />
          {t('map.legendApprox')}
        </span>
      </div>
    </div>
  );
}
