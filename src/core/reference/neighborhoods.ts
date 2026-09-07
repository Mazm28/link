import {
  cityId,
  districtId,
  neighborhoodId,
  type CityId,
  type Neighborhood,
  type NeighborhoodId as NeighborhoodIdType,
} from '../domain';
import { CITY_BY_ID } from './cities';
import { TEHRAN_NEIGHBORHOODS } from './tehran';

/* ===========================================================================
 * Neighborhoods for the four other large cities.
 *
 * Names taken from Divar's own city listings (2026-08-05), so they are the
 * names people in those cities actually use rather than an official gazetteer.
 * They are a SAMPLE — the neighborhoods that happened to have listings — not a
 * complete set. Recorded as such so nobody later mistakes this for exhaustive.
 *
 * ⚠️ GEOGRAPHY, HONESTLY: unlike Tehran's 77, these have no per-neighborhood
 * coordinates. Reliable centres for محله‌ها in Mashhad, Isfahan, Karaj and
 * Shiraz were not available, and INVENTING them would be worse than not having
 * them — a map that looks precise and is not is exactly the failure INV-5
 * exists to prevent.
 *
 * So each takes its CITY's centre and radius. Every approximate activity in
 * one of these cities therefore shows the same city-sized circle, which is a
 * truthful statement of what is known: the city, and no more. When real
 * geography arrives, only this file changes.
 *
 * The consequence for ranking is deliberate too: these have no adjacency, so
 * hop distance is undefined between them and the neighborhood feed mode falls
 * back visibly (BR-U3-64). Better than a proximity order built on coordinates
 * nobody verified.
 * =========================================================================== */

const DEFS: Record<string, readonly string[]> = {
  mashhad: [
    'احمدآباد',
    'کوه سنگی',
    'آزادشهر',
    'الهیه',
    'شهرک غرب',
    'خواجه ربیع',
    'آبکوه',
    'وکیل‌آباد',
    'طبرسی شمالی',
    'کوی سیدی',
    'پروین اعتصامی',
    'جاهد شهر',
    'بلال',
    'پورسینا',
    'کوی ولیعصر',
    'هفت تیر',
    'عبادی',
    'ایثارگران',
    'قاسم‌آباد',
    'سجاد',
  ],
  isfahan: [
    'ملک‌شهر',
    'سپاهان‌شهر',
    'بهارستان',
    'ملاصدرا',
    'باغ فردوس',
    'دستگرده',
    'کوی امیریه',
    'ارزنان',
    'شاهزاده ابراهیم',
    'مهدی‌آباد',
    'فروردین',
    'چرخاب',
    'قلعه طبرره',
    'پوریای ولی',
    'مارچین',
    'خانه اصفهان',
    'رهنان',
    'زینبیه',
  ],
  karaj: [
    'عظیمیه',
    'گوهردشت',
    'گلشهر',
    'حصار',
    'حسن‌آباد',
    'شهرک امام رضا',
    'فاز ۳ گوهردشت',
    'کرج نو',
    'کلاک نو',
    'پیشاهنگی',
    'اتحاد',
    'شهرک ظفر',
    'مهرشهر',
    'جهانشهر',
  ],
  shiraz: [
    'قصرالدشت',
    'ارم',
    'فرهنگ‌شهر',
    'ستارخان',
    'معالی‌آباد',
    'زرهی',
    'شهرک گلها',
    'شهرک بهشتی',
    'دکتر حسابی',
    'فضل‌آباد',
    'شریف‌آباد',
    'کوشک بیدک',
    'تحویلی',
    'فخرآباد',
    'ریشمک',
    'وصال',
    'دارالرحمه',
    'شیخ علی چوپان',
    'مسلم',
    'درکی',
    'آبیاری',
  ],
};

/** A stable ASCII slug per city, since the names are Persian and ids are
 *  readable slugs everywhere else in this product. */
function slugFor(city: string, index: number): string {
  return `${city}-${String(index + 1).padStart(2, '0')}`;
}

function buildFor(city: string): Neighborhood[] {
  const id = cityId(city);
  const meta = CITY_BY_ID.get(id);
  if (!meta) return [];

  return (DEFS[city] ?? []).map((nameFa, index) => ({
    id: neighborhoodId(slugFor(city, index)),
    nameFa,
    /* These cities have no district breakdown here. The field is required by
     * the type and is used only for GROUPING in the picker, so one bucket per
     * city is the truthful representation rather than invented districts. */
    districtId: districtId(city),
    cityId: id,
    /* The city's own centre and radius — see the header. Identical for every
     * neighborhood in the city, which keeps INV-5 exactly as strong here as in
     * Tehran while claiming nothing that is not known. */
    center: meta.center,
    radiusMeters: meta.radiusMeters,
    /* No adjacency. Proximity ranking degrades visibly rather than being
     * invented (BR-U3-64). */
    adjacentIds: [],
  }));
}

export const OTHER_CITY_NEIGHBORHOODS: readonly Neighborhood[] =
  Object.keys(DEFS).flatMap(buildFor);

/** Every neighborhood the product knows about, across all five big cities. */
export const ALL_NEIGHBORHOODS: readonly Neighborhood[] = [
  ...TEHRAN_NEIGHBORHOODS,
  ...OTHER_CITY_NEIGHBORHOODS,
];

export const ALL_NEIGHBORHOOD_BY_ID = new Map(ALL_NEIGHBORHOODS.map((n) => [n.id, n]));

/** The picker and the filter panel both need this: only the ACTIVE city's
 *  neighborhoods, never the whole country's. Offering Tehran's محله‌ها while
 *  posting in اصفهان was the bug this exists to prevent. */
export function neighborhoodsOfCity(id: CityId): readonly Neighborhood[] {
  return ALL_NEIGHBORHOODS.filter((n) => n.cityId === id);
}

export function cityHasNeighborhoods(id: CityId): boolean {
  return CITY_BY_ID.get(id)?.hasNeighborhoods === true;
}

export function neighborhoodName(id: NeighborhoodIdType): string | undefined {
  return ALL_NEIGHBORHOOD_BY_ID.get(id)?.nameFa;
}
