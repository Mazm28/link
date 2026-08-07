import { nanoid } from 'nanoid';

/* ===========================================================================
 * Identifiers — domain-entities.md §1
 *
 * Three decisions are encoded here:
 *
 *   PREFIXES        make an ID self-describing in a log line, a URL, or the
 *                   mock store. A wrong-ID-type bug becomes obvious on sight
 *                   rather than three layers later at runtime.
 *
 *   BRANDED TYPES   make it a COMPILE error to pass a UserId where an
 *                   ActivityId is expected. Several repository methods take
 *                   two or three ids in a row; this removes that whole class
 *                   of mistake for free.
 *
 *   OPAQUE RANDOM   for user-generated entities: no sequential enumeration,
 *                   and no leak of how many records exist. Reference data
 *                   uses readable slugs instead — it is public anyway, and
 *                   `nbh_yousefabad` is far easier to work with in seed data
 *                   and the adjacency graph than a random string.
 * =========================================================================== */

export type Brand<T, B> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type VenueId = Brand<string, 'VenueId'>;
export type ActivityId = Brand<string, 'ActivityId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type RatingId = Brand<string, 'RatingId'>;
export type ReportId = Brand<string, 'ReportId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type NeighborhoodId = Brand<string, 'NeighborhoodId'>;
export type DistrictId = Brand<string, 'DistrictId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type InterestTagId = Brand<string, 'InterestTagId'>;
/** CR-02 — the city a PERSON says they are in. Distinct from where an
 *  activity happens, which is still a neighborhood. */
export type CityId = Brand<string, 'CityId'>;
/** U2 — a bundled preset, not a URL and not a blob (DEV-U2-01). Authored, so
 *  it uses a readable slug like every other reference-data id. */
export type AvatarPresetId = Brand<string, 'AvatarPresetId'>;

export const ID_PREFIX = {
  user: 'usr_',
  venue: 'ven_',
  activity: 'act_',
  request: 'req_',
  rating: 'rat_',
  report: 'rep_',
  notification: 'ntf_',
  neighborhood: 'nbh_',
  district: 'dst_',
  category: 'cat_',
  interest: 'int_',
  avatarPreset: 'avt_',
  city: 'cty_',
} as const;

const RANDOM_ID_LENGTH = 16;

interface IdCodec<T extends string> {
  /** Generate a fresh opaque id. Reference-data codecs omit this. */
  create(): T;
  /** Narrow a raw string, or null when the prefix does not match. */
  parse(raw: string): T | null;
  is(raw: string): raw is T;
  /** Brand a hand-authored slug. Used by seed and reference data only. */
  slug(body: string): T;
}

function codec<T extends string>(prefix: string): IdCodec<T> {
  const is = (raw: string): raw is T => raw.startsWith(prefix) && raw.length > prefix.length;
  return {
    create: () => `${prefix}${nanoid(RANDOM_ID_LENGTH)}` as T,
    parse: (raw: string) => (is(raw) ? raw : null),
    is,
    slug: (body: string) => `${prefix}${body}` as T,
  };
}

export const UserIdCodec = codec<UserId>(ID_PREFIX.user);
export const VenueIdCodec = codec<VenueId>(ID_PREFIX.venue);
export const ActivityIdCodec = codec<ActivityId>(ID_PREFIX.activity);
export const RequestIdCodec = codec<RequestId>(ID_PREFIX.request);
export const RatingIdCodec = codec<RatingId>(ID_PREFIX.rating);
export const ReportIdCodec = codec<ReportId>(ID_PREFIX.report);
export const NotificationIdCodec = codec<NotificationId>(ID_PREFIX.notification);
export const NeighborhoodIdCodec = codec<NeighborhoodId>(ID_PREFIX.neighborhood);
export const DistrictIdCodec = codec<DistrictId>(ID_PREFIX.district);
export const CategoryIdCodec = codec<CategoryId>(ID_PREFIX.category);
export const InterestTagIdCodec = codec<InterestTagId>(ID_PREFIX.interest);
export const AvatarPresetIdCodec = codec<AvatarPresetId>(ID_PREFIX.avatarPreset);
export const CityIdCodec = codec<CityId>(ID_PREFIX.city);

/* Convenience constructors for the opaque, generated ids.
 * Written as wrappers rather than as method references so they carry no
 * implicit receiver — the codecs are plain objects, but an alias that looks
 * like a bound method invites someone to detach a real one later. */
export const newUserId = (): UserId => UserIdCodec.create();
export const newVenueId = (): VenueId => VenueIdCodec.create();
export const newActivityId = (): ActivityId => ActivityIdCodec.create();
export const newRequestId = (): RequestId => RequestIdCodec.create();
export const newRatingId = (): RatingId => RatingIdCodec.create();
export const newReportId = (): ReportId => ReportIdCodec.create();
export const newNotificationId = (): NotificationId => NotificationIdCodec.create();

/* Reference-data ids are authored, not generated. These exist so seed and
 * reference files can brand a slug without an `as` cast at every call site. */
export const neighborhoodId = (body: string): NeighborhoodId => NeighborhoodIdCodec.slug(body);
export const districtId = (body: string): DistrictId => DistrictIdCodec.slug(body);
export const categoryId = (body: string): CategoryId => CategoryIdCodec.slug(body);
export const interestTagId = (body: string): InterestTagId => InterestTagIdCodec.slug(body);
export const avatarPresetId = (body: string): AvatarPresetId => AvatarPresetIdCodec.slug(body);
export const cityId = (body: string): CityId => CityIdCodec.slug(body);
