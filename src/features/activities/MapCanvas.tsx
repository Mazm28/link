import { useMemo, type ReactNode } from 'react';
import type { GeoArea, GeoPoint } from '@core/domain';

/* ===========================================================================
 * MapCanvas — BR-U3-93, NFR-R10
 *
 * PROVIDER-AGNOSTIC. Round 1 has no API key and no network dependency, so this
 * renders a tile-free projection: areas as circles, points as pins, on a plain
 *背景. Round 2 drops Neshan tiles in behind the same coordinate maths by
 * passing `tileUrl`.
 *
 * That is not a compromise, it is what NFR-R10 asks for: "the app must remain
 * usable for browsing when the map provider is unreachable". Building the
 * degraded mode FIRST means it is the tested path rather than an untried
 * fallback that only runs on the day the provider breaks.
 * =========================================================================== */

export interface MapMarker {
  id: string;
  point: GeoPoint;
  label: string;
  selected?: boolean;
}

export interface MapAreaMarker {
  id: string;
  area: GeoArea;
  label: string;
  count: number;
}

export interface MapCanvasProps {
  center: GeoPoint;
  /** Half-height of the viewport in degrees of latitude. Smaller is closer. */
  spanDegrees?: number;
  markers?: readonly MapMarker[];
  areas?: readonly MapAreaMarker[];
  onMarkerClick?: (id: string) => void;
  onMapClick?: (point: GeoPoint) => void;
  /** Round 2. Absent in Round 1, which is the tested path. */
  tileUrl?: string | undefined;
  height?: number;
  children?: ReactNode;
  'data-testid'?: string;
}

const VIEW_W = 600;
const VIEW_H = 400;

export function MapCanvas({
  center,
  spanDegrees = 0.06,
  markers = [],
  areas = [],
  onMarkerClick,
  onMapClick,
  tileUrl,
  height = 320,
  children,
  'data-testid': testId,
}: MapCanvasProps) {
  /* Equirectangular, with the longitude span corrected by cos(lat) so Tehran
   * does not render stretched. Good enough for a city; nothing here needs a
   * real projection. */
  const projection = useMemo(() => {
    const latSpan = spanDegrees;
    const lngSpan = spanDegrees / Math.cos((center.lat * Math.PI) / 180);

    const toX = (lng: number) => ((lng - (center.lng - lngSpan)) / (2 * lngSpan)) * VIEW_W;
    const toY = (lat: number) => ((center.lat + latSpan - lat) / (2 * latSpan)) * VIEW_H;
    /* Metres to viewport units, via the latitude span. */
    const metersToUnits = (m: number) => (m / (latSpan * 111_320)) * (VIEW_H / 2);

    const fromXY = (x: number, y: number): GeoPoint => ({
      lat: Number((center.lat + latSpan - (y / VIEW_H) * 2 * latSpan).toFixed(6)),
      lng: Number((center.lng - lngSpan + (x / VIEW_W) * 2 * lngSpan).toFixed(6)),
    });

    return { toX, toY, metersToUnits, fromXY };
  }, [center.lat, center.lng, spanDegrees]);

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onMapClick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    onMapClick(projection.fromXY(x, y));
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-sunken"
      style={{ height }}
      data-testid={testId}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        onClick={handleClick}
        role="img"
      >
        {tileUrl === undefined ? (
          /* The tile-free ground. A faint grid reads as "a map without
           * streets" rather than as a blank box someone will report as
           * broken. */
          <g aria-hidden="true">
            <rect width={VIEW_W} height={VIEW_H} className="fill-surface-sunken" />
            {Array.from({ length: 13 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={(i * VIEW_W) / 12}
                y1={0}
                x2={(i * VIEW_W) / 12}
                y2={VIEW_H}
                className="stroke-border"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={(i * VIEW_H) / 8}
                x2={VIEW_W}
                y2={(i * VIEW_H) / 8}
                className="stroke-border"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}
          </g>
        ) : (
          <image
            href={tileUrl}
            width={VIEW_W}
            height={VIEW_H}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* AREAS first, so a pin is never hidden under a circle. */}
        {areas.map((a) => (
          <g key={a.id} data-testid={`map-area-${a.id}`}>
            <circle
              cx={projection.toX(a.area.center.lng)}
              cy={projection.toY(a.area.center.lat)}
              r={projection.metersToUnits(a.area.radiusMeters)}
              className="fill-brand stroke-brand"
              fillOpacity="0.14"
              strokeOpacity="0.55"
              strokeWidth="1.5"
            />
            <text
              x={projection.toX(a.area.center.lng)}
              y={projection.toY(a.area.center.lat)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-fg"
              fontSize="11"
            >
              {a.label}
            </text>
          </g>
        ))}

        {markers.map((m) => {
          const x = projection.toX(m.point.lng);
          const y = projection.toY(m.point.lat);
          return (
            <g
              key={m.id}
              data-testid={`map-pin-${m.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick?.(m.id);
              }}
              style={{ cursor: onMarkerClick ? 'pointer' : undefined }}
            >
              <title>{m.label}</title>
              {/* A teardrop, so a pin is never mistaken for the circle of an
                  approximate area — the two must be distinguishable at a
                  glance, because they mean different things. */}
              <path
                d={`M ${x} ${y} l -7 -11 a 8 8 0 1 1 14 0 z`}
                className={m.selected === true ? 'fill-danger' : 'fill-brand'}
                stroke="#fff"
                strokeWidth="1.2"
              />
              <circle cx={x} cy={y - 15} r="3" fill="#fff" />
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}
