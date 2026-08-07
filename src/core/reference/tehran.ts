import {
  cityId,
  districtId,
  neighborhoodId,
  type District,
  type Neighborhood,
  type NeighborhoodId,
} from '../domain';

/* ===========================================================================
 * Tehran reference data — Requirements §6.4, Units Gen Q2 `A`
 *
 * A curated subset: 22 districts and 77 neighborhoods, chosen for coverage
 * across the city rather than completeness. Round 1 needs enough of the graph
 * for proximity ranking to behave believably, not a gazetteer.
 *
 * AUTHORING RULE — edges are declared ONCE, in EDGES below, and both
 * directions are derived. BR-U1-23 requires the adjacency graph to be
 * symmetric, and the reliable way to guarantee that is to make asymmetry
 * inexpressible rather than to hand-write both sides and test for drift.
 * P-U1-07 still checks the built result, because someone may later edit the
 * derived output or add a neighborhood without an edge.
 * =========================================================================== */

export const TEHRAN_DISTRICTS: readonly District[] = [
  ['01', '۱'],
  ['02', '۲'],
  ['03', '۳'],
  ['04', '۴'],
  ['05', '۵'],
  ['06', '۶'],
  ['07', '۷'],
  ['08', '۸'],
  ['09', '۹'],
  ['10', '۱۰'],
  ['11', '۱۱'],
  ['12', '۱۲'],
  ['13', '۱۳'],
  ['14', '۱۴'],
  ['15', '۱۵'],
  ['16', '۱۶'],
  ['17', '۱۷'],
  ['18', '۱۸'],
  ['19', '۱۹'],
  ['20', '۲۰'],
  ['21', '۲۱'],
  ['22', '۲۲'],
].map(([code, fa]) => ({ id: districtId(code!), nameFa: `منطقه ${fa}` }));

/** [slug, Persian name, district code] */
/**
 * `[slug, nameFa, districtId, lat, lng, radiusMeters]`
 *
 * Coordinates are hand-authored approximations — accurate enough that the map
 * reads as Tehran, and not surveyed. That is acceptable BECAUSE OF INV-5, and
 * only because of it: every approximate circle is derived from the
 * NEIGHBOURHOOD, so an imprecise centre yields an imprecise circle and never a
 * leak. Accuracy here is a usefulness property.
 *
 * Had circles been centred on each activity's own point — the obvious
 * implementation — this same imprecision would have been a privacy defect
 * instead of a cosmetic one.
 *
 * `radiusMeters` reflects how large each area actually is: تجریش is compact,
 * چیتگر and شهرری are not.
 */
const NEIGHBORHOOD_DEFS: ReadonlyArray<
  readonly [string, string, string, number, number, number]
> = [
  // منطقه ۱ — شمیرانات
  ['tajrish', 'تجریش', '01', 35.8046, 51.4344, 900],
  ['niavaran', 'نیاوران', '01', 35.8172, 51.4707, 1100],
  ['zaferanieh', 'زعفرانیه', '01', 35.8025, 51.418, 800],
  ['velenjak', 'ولنجک', '01', 35.8065, 51.396, 900],
  ['elahieh', 'الهیه', '01', 35.7936, 51.4265, 800],
  ['farmanieh', 'فرمانیه', '01', 35.806, 51.456, 900],
  ['qeytarieh', 'قیطریه', '01', 35.792, 51.443, 800],

  // منطقه ۲
  ['saadatabad', 'سعادت‌آباد', '02', 35.781, 51.376, 1200],
  ['shahrak-gharb', 'شهرک غرب', '02', 35.7635, 51.369, 1200],
  ['marzdaran', 'مرزداران', '02', 35.742, 51.356, 900],
  ['sadeghieh', 'صادقیه', '02', 35.718, 51.339, 1000],
  ['tarasht', 'طرشت', '02', 35.728, 51.352, 800],
  ['gisha', 'گیشا', '02', 35.735, 51.376, 800],

  // منطقه ۳
  ['vanak', 'ونک', '03', 35.759, 51.41, 900],
  ['jordan', 'جردن', '03', 35.766, 51.42, 900],
  ['mirdamad', 'میرداماد', '03', 35.76, 51.432, 900],
  ['zafar', 'ظفر', '03', 35.769, 51.429, 800],

  // منطقه ۴
  ['pasdaran', 'پاسداران', '04', 35.786, 51.46, 1200],
  ['heravi', 'هروی', '04', 35.774, 51.478, 900],
  ['lavizan', 'لویزان', '04', 35.792, 51.503, 1200],
  ['tehranpars', 'تهران‌پارس', '04', 35.736, 51.533, 1600],
  ['majidieh', 'مجیدیه', '04', 35.735, 51.468, 900],

  // منطقه ۵
  ['punak', 'پونک', '05', 35.762, 51.332, 1300],
  ['janatabad', 'جنت‌آباد', '05', 35.748, 51.312, 1300],
  ['shahran', 'شهران', '05', 35.776, 51.32, 1200],
  ['kashani', 'آیت‌الله کاشانی', '05', 35.744, 51.33, 1100],
  ['ekbatan', 'اکباتان', '05', 35.704, 51.307, 1200],

  // منطقه ۶
  ['yousefabad', 'یوسف‌آباد', '06', 35.732, 51.403, 900],
  ['amirabad', 'امیرآباد', '06', 35.739, 51.39, 900],
  ['fatemi', 'فاطمی', '06', 35.726, 51.396, 800],
  ['jamalzadeh', 'جمالزاده', '06', 35.702, 51.386, 700],
  ['karimkhan', 'کریم‌خان', '06', 35.713, 51.413, 900],

  // منطقه ۷
  ['abbasabad', 'عباس‌آباد', '07', 35.737, 51.43, 900],
  ['sohrevardi', 'سهروردی', '07', 35.728, 51.434, 900],
  ['bahar', 'بهار', '07', 35.713, 51.434, 800],
  ['nezamabad', 'نظام‌آباد', '07', 35.706, 51.453, 900],

  // منطقه ۸
  ['narmak', 'نارمک', '08', 35.742, 51.506, 1500],
  ['tehran-no', 'تهران‌نو', '08', 35.718, 51.488, 1000],

  // منطقه ۹
  ['mehrabad', 'مهرآباد', '09', 35.693, 51.323, 1200],
  ['ostad-moein', 'استاد معین', '09', 35.696, 51.348, 900],

  // منطقه ۱۰
  ['salsabil', 'سلسبیل', '10', 35.69, 51.372, 800],
  ['haft-chenar', 'هفت چنار', '10', 35.684, 51.356, 800],

  // منطقه ۱۱
  ['jomhouri', 'جمهوری', '11', 35.698, 51.405, 800],
  ['monirieh', 'منیریه', '11', 35.687, 51.4, 700],
  ['amirieh', 'امیریه', '11', 35.683, 51.394, 700],
  ['hasanabad', 'حسن‌آباد', '11', 35.69, 51.413, 700],

  // منطقه ۱۲
  ['bazar', 'بازار', '12', 35.672, 51.423, 900],
  ['baharestan', 'بهارستان', '12', 35.69, 51.429, 800],
  ['molavi', 'مولوی', '12', 35.664, 51.418, 800],
  ['saadi', 'سعدی', '12', 35.684, 51.423, 700],

  // منطقه ۱۳
  ['piroozi', 'پیروزی', '13', 35.697, 51.478, 1300],
  ['niroo-havaei', 'نیروی هوایی', '13', 35.701, 51.464, 900],
  ['dehghan', 'دهقان', '13', 35.706, 51.472, 800],

  // منطقه ۱۴
  ['afsarieh', 'افسریه', '14', 35.66, 51.501, 1300],
  ['mahallati', 'شهید محلاتی', '14', 35.672, 51.49, 900],

  // منطقه ۱۵
  ['khavaran', 'خاوران', '15', 35.651, 51.477, 1300],
  ['moshirieh', 'مشیریه', '15', 35.642, 51.503, 1100],
  ['atabak', 'اتابک', '15', 35.658, 51.452, 900],

  // منطقه ۱۶
  ['nazi-abad', 'نازی‌آباد', '16', 35.644, 51.402, 1200],
  ['javadieh', 'جوادیه', '16', 35.656, 51.396, 900],
  ['khazaneh', 'خزانه', '16', 35.648, 51.418, 900],

  // منطقه ۱۷
  ['abuzar', 'ابوذر', '17', 35.662, 51.366, 800],
  ['zamzam', 'زمزم', '17', 35.669, 51.361, 800],
  ['falah', 'فلاح', '17', 35.658, 51.373, 800],

  // منطقه ۱۸
  ['yaftabad', 'یافت‌آباد', '18', 35.657, 51.323, 1300],
  ['shamshiri', 'شمشیری', '18', 35.666, 51.34, 900],
  ['shadabad', 'شادآباد', '18', 35.672, 51.313, 1100],

  // منطقه ۱۹
  ['nematabad', 'نعمت‌آباد', '19', 35.631, 51.376, 1100],
  ['ahmadieh', 'شهرک احمدیه', '19', 35.624, 51.39, 900],

  // منطقه ۲۰
  ['shahr-rey', 'شهرری', '20', 35.594, 51.434, 1800],
  ['dolatabad', 'دولت‌آباد', '20', 35.618, 51.439, 1100],
  ['javanmard', 'جوانمرد قصاب', '20', 35.606, 51.413, 1000],

  // منطقه ۲۱
  ['tehransar', 'تهرانسر', '21', 35.704, 51.254, 1500],
  ['shahrak-azadi', 'شهرک آزادی', '21', 35.715, 51.286, 1000],

  // منطقه ۲۲
  ['chitgar', 'چیتگر', '22', 35.736, 51.226, 1800],
  ['rah-ahan', 'شهرک راه‌آهن', '22', 35.725, 51.267, 1200],
  ['golestan', 'شهرک گلستان', '22', 35.746, 51.244, 1200],
];

/**
 * Undirected edges, written once per pair.
 *
 * Grouped by district so the intra-district chains are easy to read, then the
 * inter-district links that stitch the city together. Every neighborhood must
 * appear at least once — BR-U1-25, checked by P-U1-10.
 */
const EDGES: ReadonlyArray<readonly [string, string]> = [
  // ---- within districts
  ['tajrish', 'niavaran'],
  ['niavaran', 'farmanieh'],
  ['tajrish', 'qeytarieh'],
  ['tajrish', 'zaferanieh'],
  ['zaferanieh', 'velenjak'],
  ['zaferanieh', 'elahieh'],
  ['elahieh', 'farmanieh'],

  ['saadatabad', 'shahrak-gharb'],
  ['shahrak-gharb', 'marzdaran'],
  ['marzdaran', 'sadeghieh'],
  ['sadeghieh', 'tarasht'],
  ['tarasht', 'gisha'],
  ['gisha', 'saadatabad'],

  ['vanak', 'jordan'],
  ['jordan', 'mirdamad'],
  ['mirdamad', 'zafar'],
  ['zafar', 'vanak'],

  ['pasdaran', 'heravi'],
  ['heravi', 'lavizan'],
  ['lavizan', 'tehranpars'],
  ['pasdaran', 'majidieh'],

  ['punak', 'janatabad'],
  ['janatabad', 'shahran'],
  ['punak', 'kashani'],
  ['kashani', 'ekbatan'],

  ['yousefabad', 'amirabad'],
  ['amirabad', 'fatemi'],
  ['fatemi', 'jamalzadeh'],
  ['yousefabad', 'karimkhan'],

  ['abbasabad', 'sohrevardi'],
  ['sohrevardi', 'bahar'],
  ['bahar', 'nezamabad'],

  ['narmak', 'tehran-no'],
  ['mehrabad', 'ostad-moein'],
  ['salsabil', 'haft-chenar'],

  ['jomhouri', 'monirieh'],
  ['monirieh', 'amirieh'],
  ['jomhouri', 'hasanabad'],

  ['bazar', 'baharestan'],
  ['bazar', 'molavi'],
  ['baharestan', 'saadi'],

  ['piroozi', 'niroo-havaei'],
  ['niroo-havaei', 'dehghan'],

  ['afsarieh', 'mahallati'],

  ['khavaran', 'moshirieh'],
  ['moshirieh', 'atabak'],

  ['nazi-abad', 'javadieh'],
  ['javadieh', 'khazaneh'],

  ['abuzar', 'zamzam'],
  ['zamzam', 'falah'],

  ['yaftabad', 'shamshiri'],
  ['shamshiri', 'shadabad'],

  ['nematabad', 'ahmadieh'],

  ['shahr-rey', 'dolatabad'],
  ['dolatabad', 'javanmard'],

  ['tehransar', 'shahrak-azadi'],

  ['chitgar', 'rah-ahan'],
  ['rah-ahan', 'golestan'],

  // ---- across districts
  ['velenjak', 'vanak'],
  ['qeytarieh', 'mirdamad'],
  ['farmanieh', 'pasdaran'],
  ['zaferanieh', 'saadatabad'],
  ['saadatabad', 'vanak'],
  ['gisha', 'amirabad'],
  ['sadeghieh', 'punak'],
  ['tarasht', 'ekbatan'],
  ['vanak', 'yousefabad'],
  ['mirdamad', 'abbasabad'],
  ['pasdaran', 'narmak'],
  ['majidieh', 'nezamabad'],
  ['tehranpars', 'piroozi'],
  ['lavizan', 'narmak'],
  ['kashani', 'mehrabad'],
  ['ekbatan', 'tehransar'],
  ['shahran', 'chitgar'],
  ['janatabad', 'rah-ahan'],
  ['karimkhan', 'abbasabad'],
  ['jamalzadeh', 'salsabil'],
  ['yousefabad', 'jomhouri'],
  ['nezamabad', 'narmak'],
  ['bahar', 'baharestan'],
  ['tehran-no', 'piroozi'],
  ['narmak', 'niroo-havaei'],
  ['mehrabad', 'yaftabad'],
  ['ostad-moein', 'salsabil'],
  ['mehrabad', 'tehransar'],
  ['haft-chenar', 'abuzar'],
  ['salsabil', 'jomhouri'],
  ['amirieh', 'molavi'],
  ['hasanabad', 'bazar'],
  ['molavi', 'khazaneh'],
  ['piroozi', 'afsarieh'],
  ['dehghan', 'khavaran'],
  ['mahallati', 'khavaran'],
  ['atabak', 'nazi-abad'],
  ['khazaneh', 'shahr-rey'],
  ['nazi-abad', 'abuzar'],
  ['javadieh', 'zamzam'],
  ['falah', 'yaftabad'],
  ['shadabad', 'nematabad'],
  ['yaftabad', 'nematabad'],
  ['ahmadieh', 'shahr-rey'],
  ['nematabad', 'javanmard'],
  ['tehransar', 'chitgar'],
  ['shahrak-azadi', 'golestan'],
];

function buildNeighborhoods(): Neighborhood[] {
  const adjacency = new Map<string, Set<string>>(NEIGHBORHOOD_DEFS.map(([slug]) => [slug, new Set()]));

  for (const [a, b] of EDGES) {
    // Both directions from one declaration — this is what makes BR-U1-23
    // hold by construction rather than by review.
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  }

  return NEIGHBORHOOD_DEFS.map(([slug, nameFa, district, lat, lng, radiusMeters]) => ({
    id: neighborhoodId(slug),
    nameFa,
    districtId: districtId(district),
    /* Round 1's entire dataset is Tehran. The field exists so browsing can be
     * city-scoped (BR-U3-50) and so a second city is data rather than a
     * refactor. */
    cityId: cityId('tehran'),
    center: { lat, lng },
    radiusMeters,
    adjacentIds: [...(adjacency.get(slug) ?? [])].sort().map(neighborhoodId),
  }));
}

export const TEHRAN_NEIGHBORHOODS: readonly Neighborhood[] = buildNeighborhoods();

export const NEIGHBORHOOD_BY_ID: ReadonlyMap<NeighborhoodId, Neighborhood> = new Map(
  TEHRAN_NEIGHBORHOODS.map((n) => [n.id, n]),
);

export function neighborhoodName(id: NeighborhoodId): string | undefined {
  return NEIGHBORHOOD_BY_ID.get(id)?.nameFa;
}
