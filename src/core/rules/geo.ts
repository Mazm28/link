import type { CityId, GeoArea, GeoPoint, NeighborhoodId } from '../domain';
import { CITY_BY_ID } from '../reference/cities';
import { ALL_NEIGHBORHOOD_BY_ID } from '../reference/neighborhoods';

/* ===========================================================================
 * Geography — business-rules.md §2 (BR-U3-16, BR-U3-17), INV-5
 *
 * ⚠️ THE SIGNATURE OF `areaOf` IS THE SAFETY GUARANTEE.
 *
 * It takes IDS — a city, and optionally a neighborhood. It is never given an
 * activity, so it cannot
 * derive an area from an activity's own coordinate — not because a rule
 * forbids it, but because the input does not exist here. Changing that would
 * mean changing this signature, which is a visible, reviewable act rather than
 * a line inside a function nobody re-reads.
 *
 * Three implementations this rules out, and why each leaks:
 *
 *   CIRCLE ON THE TRUE POINT   the centre IS the location. The radius is
 *                              decoration; the payload discloses the point
 *                              exactly.
 *
 *   TRUE POINT + JITTER        feels safer, is not. Two viewers comparing
 *                              screens, or one refreshing, averages the offset
 *                              away. Any per-activity randomness is a leak
 *                              measured in observations.
 *
 *   SNAP TO A FINE GRID        a 100 m grid narrows a home to one city block.
 *                              Deterministic, and still far too precise.
 *
 * What is built instead: every `neighborhood`-precision activity in یوسف‌آباد
 * resolves to یوسف‌آباد's own centre and radius — byte-identical output. The
 * map then says exactly what «حوالی یوسف‌آباد» says, and nothing more.
 * =========================================================================== */

/**
 * INV-5 / BR-U3-17 — the area shown for a `neighborhood`-precision activity.
 *
 * A pure function of the neighborhood. Two activities in the same neighborhood
 * produce equal areas, which is what P-U3-01 asserts — a property checking only
 * "no coordinate key" would pass against a jittered implementation, and jitter
 * is exactly the failure this exists to prevent.
 */
export function areaOf(
  cityId: CityId,
  neighborhoodId?: NeighborhoodId,
): GeoArea | undefined {
  /* Still IDS ONLY, never an activity — the guarantee is unchanged. The city
   * is the fallback for the twenty cities with no neighborhood dataset: an
   * activity there resolves to a city-sized circle, identical for every
   * activity in that city. Coarser, and true. */
  if (neighborhoodId !== undefined) {
    const neighborhood = ALL_NEIGHBORHOOD_BY_ID.get(neighborhoodId);
    if (neighborhood) {
      return { center: neighborhood.center, radiusMeters: neighborhood.radiusMeters };
    }
  }

  const city = CITY_BY_ID.get(cityId);
  if (!city) return undefined;
  return { center: city.center, radiusMeters: city.radiusMeters };
}

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Great-circle distance in metres.
 *
 * Used for map fitting and for clustering pins — never for ranking. Ranking
 * uses the ADJACENCY GRAPH (BR-U1-23), because "two neighborhoods over" is how
 * people actually reason about a city, and a straight line across a motorway
 * or a mountain is not a walk.
 */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box around a set of points, for fitting the map view. */
export function boundsOf(points: readonly GeoPoint[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (points.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }

  return { north, south, east, west };
}

/**
 * Tehran's bounding box, used only by a sanity property over the reference
 * data. It cannot check that یوسف‌آباد's centre is really in یوسف‌آباد — no
 * test can — but it does catch a transposed pair or a dropped digit, which is
 * the realistic authoring error in 77 hand-written rows.
 */
export const TEHRAN_BOUNDS = { north: 35.84, south: 35.56, east: 51.61, west: 51.19 } as const;

export function isWithinTehran(point: GeoPoint): boolean {
  return (
    point.lat <= TEHRAN_BOUNDS.north &&
    point.lat >= TEHRAN_BOUNDS.south &&
    point.lng <= TEHRAN_BOUNDS.east &&
    point.lng >= TEHRAN_BOUNDS.west
  );
}
