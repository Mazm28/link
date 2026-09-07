import { cityId, type CityId } from '../domain/ids';
import type { City } from '../domain';

/* ===========================================================================
 * Iranian cities — CR-02 item 4
 *
 * Replaces the neighborhood picker on the PROFILE. Neighborhoods are still the
 * unit an ACTIVITY is posted in, and the Tehran dataset and its adjacency
 * graph are untouched — this changes what a person says about themselves, not
 * where things happen.
 *
 * One consequence is worth stating plainly rather than discovering later:
 * FR-21 ranks the feed by nearness to the viewer's NEIGHBORHOOD, using the
 * hop-distance graph built in U1. A profile that stores only a city cannot
 * supply that origin, so for anyone who signs up after this change the
 * neighborhood-ranked feed has nothing to rank from. Seeded users still have a
 * neighborhood, so the mode keeps working for them. See CR-02 §4.
 *
 * Tehran is first because it is the launch market (AS-01) and, in Round 1, the
 * only city any activity is actually in.
 * =========================================================================== */

/**
 * `[slug, nameFa, lat, lng, radiusMeters, hasNeighborhoods]`
 *
 * `hasNeighborhoods` is a DATA fact, not a policy: only the five largest
 * cities have a neighborhood dataset, so only they can offer a neighborhood
 * choice. Everywhere else an activity is located to the city, and the map
 * shows a city-sized area.
 *
 * `radiusMeters` is the city-level area used when an activity has no
 * neighborhood — the INV-5 fallback, derived from the CITY and identical for
 * every activity in it.
 */
const CITY_DEFS: ReadonlyArray<readonly [string, string, number, number, number, boolean]> = [
  ['tehran', 'تهران', 35.6997, 51.4015, 18000, true],
  ['mashhad', 'مشهد', 36.2972, 59.6067, 14000, true],
  ['isfahan', 'اصفهان', 32.6572, 51.6776, 12000, true],
  ['karaj', 'کرج', 35.8355, 50.9915, 10000, true],
  ['shiraz', 'شیراز', 29.5918, 52.5837, 10000, true],
  ['tabriz', 'تبریز', 38.08, 46.2919, 9000, false],
  ['qom', 'قم', 34.6416, 50.8746, 8000, false],
  ['ahvaz', 'اهواز', 31.3183, 48.6706, 9000, false],
  ['kermanshah', 'کرمانشاه', 34.3142, 47.065, 7000, false],
  ['urmia', 'ارومیه', 37.5527, 45.0761, 7000, false],
  ['rasht', 'رشت', 37.2808, 49.5832, 6000, false],
  ['zahedan', 'زاهدان', 29.4963, 60.8629, 6000, false],
  ['hamedan', 'همدان', 34.7992, 48.5146, 6000, false],
  ['kerman', 'کرمان', 30.2839, 57.0834, 7000, false],
  ['yazd', 'یزد', 31.8974, 54.3569, 7000, false],
  ['ardabil', 'اردبیل', 38.2498, 48.2933, 6000, false],
  ['bandarabbas', 'بندرعباس', 27.1832, 56.2666, 6000, false],
  ['arak', 'اراک', 34.0954, 49.7013, 6000, false],
  ['eslamshahr', 'اسلامشهر', 35.5522, 51.235, 5000, false],
  ['zanjan', 'زنجان', 36.6736, 48.4787, 5000, false],
  ['sanandaj', 'سنندج', 35.3144, 46.9923, 5000, false],
  ['qazvin', 'قزوین', 36.2688, 50.0041, 6000, false],
  ['khorramabad', 'خرم‌آباد', 33.4878, 48.3558, 5000, false],
  ['gorgan', 'گرگان', 36.8427, 54.4436, 5000, false],
  ['sari', 'ساری', 36.5633, 53.0601, 5000, false],
] as const;

export const IRAN_CITIES: readonly City[] = CITY_DEFS.map(
  ([slug, nameFa, lat, lng, radiusMeters, hasNeighborhoods]) => ({
    id: cityId(slug),
    nameFa,
    center: { lat, lng },
    radiusMeters,
    hasNeighborhoods,
  }),
);

/** The five cities with a neighborhood dataset. Everywhere else, an activity
 *  is located to the city and nothing finer is offered — which is honest,
 *  because nothing finer is known. */
export const CITIES_WITH_NEIGHBORHOODS = IRAN_CITIES.filter((c) => c.hasNeighborhoods);

export const CITY_BY_ID = new Map(IRAN_CITIES.map((city) => [city.id, city]));

export function cityName(id: CityId): string | undefined {
  return CITY_BY_ID.get(id)?.nameFa;
}

export function isKnownCity(id: CityId): boolean {
  return CITY_BY_ID.has(id);
}
