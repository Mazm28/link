import {
  ActivityIdCodec,
  categoryId,
  interestTagId,
  neighborhoodId,
  NotificationIdCodec,
  RatingIdCodec,
  ReportIdCodec,
  RequestIdCodec,
  UserIdCodec,
  VenueIdCodec,
  type Activity,
  type ActivityId,
  type Attendance,
  type Block,
  type JoinRequest,
  type Notification,
  type Rating,
  type Report,
  type User,
  type UserId,
  type Venue,
} from '@core/domain';
import { SCHEMA_VERSION, type StoreShape } from './LocalStore';
import { NEIGHBORHOOD_BY_ID } from '@core/reference/tehran';
import { cityId as cty } from '@core/domain';

/* ===========================================================================
 * Seed data — business-logic-model.md §5, Design Q6 `A`
 *
 * NFR-A3: content is HAND-AUTHORED REALISTIC PERSIAN. Real Tehran
 * neighborhoods, plausible names, activity titles someone would actually post.
 * Lorem ipsum and generated filler are prohibited here, and not for tidiness:
 * filler hides the text-length and RTL problems that only appear with genuine
 * Persian — a title that wraps to three lines, a name that is one character,
 * a description with a ZWNJ in the wrong place.
 *
 * INVARIANT DISCIPLINE: this dataset must satisfy every domain rule it will
 * later be tested against. In particular every Rating below is between the
 * poster and a CONFIRMED attendee (US-52). A seed containing a rating from an
 * unconfirmed attendee would make U4's property test fail against data we
 * authored ourselves — and it would be right to fail.
 *
 * Dates are relative to load time, so the prototype always has a believable
 * mix of upcoming and past activities regardless of when it is opened.
 * =========================================================================== */

const u = (n: string): UserId => UserIdCodec.slug(n);
const a = (n: string): ActivityId => ActivityIdCodec.slug(n);
const ven = (n: string) => VenueIdCodec.slug(n);
const nb = neighborhoodId;
const cat = categoryId;
const int = interestTagId;

/** Build an ISO-8601 UTC timestamp for a Tehran wall-clock hour, `dayOffset`
 *  days from now. Tehran is UTC+03:30, so 19:00 Tehran is 15:30 UTC. */
function at(now: Date, dayOffset: number, tehranHour: number): string {
  const d = new Date(now.getTime() + dayOffset * 86_400_000);
  d.setUTCHours(tehranHour - 4, 30, 0, 0);
  return d.toISOString();
}

const ago = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

/* ------------------------------------------------------------------- users */

interface UserSeed {
  n: string;
  name: string;
  neighborhood: string;
  interests: string[];
  bio?: string;
  telegram?: string;
}

/** Twelve regular users, spread across districts, with varied interests and
 *  rating histories — including سارا, who is deliberately a new member with
 *  no ratings at all so the "new member" display path is reachable. */
const USER_SEEDS: UserSeed[] = [
  {
    n: '01',
    name: 'آرش کاویانی',
    neighborhood: 'yousefabad',
    interests: ['boardgames', 'chess'],
    bio: 'سال‌هاست بازی رومیزی بازی می‌کنم و دنبال میز ثابتم.',
    telegram: 'arash_k',
  },
  {
    n: '02',
    name: 'زهرا کریمی',
    neighborhood: 'vanak',
    interests: ['hiking', 'nature', 'photography'],
    bio: 'آخر هفته‌ها کوه. بقیه‌ی هفته عکس‌های کوه.',
    telegram: 'zahra_k',
  },
  {
    n: '03',
    name: 'محمد رضایی',
    neighborhood: 'narmak',
    interests: ['videogames', 'programming', 'boardgames'],
    bio: 'برنامه‌نویس. شب‌ها بازی، روزها باگ.',
  },
  {
    n: '04',
    name: 'نگار احمدی',
    neighborhood: 'tajrish',
    interests: ['books', 'poetry', 'cafe'],
    bio: 'کتاب‌خوان حرفه‌ای، کافه‌گرد نیمه‌حرفه‌ای.',
    telegram: 'negar_reads',
  },
  {
    n: '05',
    name: 'سینا مرادی',
    neighborhood: 'punak',
    interests: ['football', 'running', 'cycling'],
    bio: 'هر هفته دنبال یک بازی فوتبال می‌گردم.',
  },
  {
    n: '06',
    name: 'مریم حسینی',
    neighborhood: 'saadatabad',
    interests: ['cinema', 'theatre', 'music'],
    bio: 'فیلم می‌بینم و بعدش دو ساعت درباره‌اش حرف می‌زنم.',
    telegram: 'maryam_h',
  },
  {
    n: '07',
    name: 'رضا نوری',
    neighborhood: 'piroozi',
    interests: ['boardgames', 'chess', 'study'],
    bio: 'شطرنج‌باز آماتور.',
  },
  {
    n: '08',
    name: 'الهام صادقی',
    neighborhood: 'gisha',
    interests: ['language', 'books', 'cafe'],
    bio: 'دنبال هم‌صحبت انگلیسی برای تمرین مکالمه.',
    telegram: 'elham_s',
  },
  {
    n: '09',
    name: 'کیان جعفری',
    neighborhood: 'shahrak-gharb',
    interests: ['programming', 'startup', 'videogames'],
    bio: 'روی یک محصول کوچک کار می‌کنم.',
  },
  {
    n: '10',
    name: 'شیما رستمی',
    neighborhood: 'mirdamad',
    interests: ['painting', 'photography', 'walking'],
    bio: 'نقاشی می‌کنم، بیشترش ناتمام.',
  },
  {
    n: '11',
    name: 'امیر توکلی',
    neighborhood: 'tehransar',
    interests: ['hiking', 'walking', 'nature'],
    bio: 'غرب تهران، ولی برای طبیعت تا هرجا می‌آیم.',
  },
  {
    // New member: no ratings anywhere in the seed, so RatingSummary renders
    // "هنوز امتیازی ندارد" rather than a zero score (US-53).
    n: '12',
    name: 'سارا بهرامی',
    neighborhood: 'abbasabad',
    interests: ['cooking', 'cafe', 'music'],
    bio: 'تازه به تهران آمده‌ام.',
  },
];

/** Venue-owner accounts. Separate from the twelve above because a Venue needs
 *  an owning account, and FR-05 makes account type an account-level property. */
const VENUE_OWNER_SEEDS: UserSeed[] = [
  { n: '90', name: 'کافه بازی رخ', neighborhood: 'yousefabad', interests: ['boardgames'] },
  { n: '91', name: 'کافه کتاب هزارتو', neighborhood: 'vanak', interests: ['books'] },
  { n: '92', name: 'سینما کلوپ ققنوس', neighborhood: 'abbasabad', interests: ['cinema'] },
];

function buildUsers(now: Date): User[] {
  const mk = (s: UserSeed, kind: 'user' | 'venue', i: number): User => ({
    id: u(s.n),
    phone: `+98912${String(1000000 + i * 4321).slice(0, 7)}`,
    displayName: s.name,
    interestIds: s.interests.map(int),
    homeNeighborhoodId: nb(s.neighborhood),
    accountType: kind,
    accountStatus: 'active',
    isAnonymized: false,
    createdAt: ago(now, 120 - i * 3),
    /* U2 BACKFILL — not decoration.
     *
     * Every seeded user predates `profileCompletedAt`, and BR-U2-32 says an
     * account without it returns null from getProfile and appears in NO feed,
     * listing, or search result. Omit these two lines and every seeded user
     * reads as incomplete, the whole feed empties, and it presents as a
     * catastrophic regression caused by a missing field.
     *
     * `safetyGuidanceSeenAt` is set for the same reason it is realistic: these
     * are established accounts, not first-run ones. The guidance flow is
     * exercised by signing in with a NEW number, which is the honest path. */
    profileCompletedAt: ago(now, 120 - i * 3),
    safetyGuidanceSeenAt: ago(now, 120 - i * 3),
    ...(s.bio === undefined ? {} : { bio: s.bio }),
    ...(s.telegram === undefined ? {} : { telegramId: s.telegram }),
  });

  return [
    ...USER_SEEDS.map((s, i) => mk(s, 'user', i)),
    ...VENUE_OWNER_SEEDS.map((s, i) => mk(s, 'venue', i + 20)),
  ];
}

/* ------------------------------------------------------------------ venues */

function buildVenues(now: Date): Venue[] {
  return [
    {
      id: ven('rokh'),
      ownerUserId: u('90'),
      businessName: 'کافه بازی رخ',
      description:
        'کافه‌ی بازی‌های رومیزی با بیش از دویست عنوان بازی. هر شب میز باز داریم و اگر تنها بیایید، به یک میز وصلتان می‌کنیم.',
      address: 'یوسف‌آباد، خیابان سیدجمال‌الدین اسدآبادی، کوچه‌ی چهاردهم، پلاک ۸',
      neighborhoodId: nb('yousefabad'),
      contactInfo: '۰۲۱-۸۸۷۷۶۶۵۵',
      // All seeded venues are approved: there is no approver until Round 3,
      // so a `pending` venue in the seed would be permanently stuck and the
      // demo would show a dead end (US-61 known gap).
      verificationStatus: 'approved',
      createdAt: ago(now, 300),
    },
    {
      id: ven('hezartu'),
      ownerUserId: u('91'),
      businessName: 'کافه کتاب هزارتو',
      description:
        'کافه و کتاب‌فروشی. جلسات کتاب‌خوانی هفتگی، و یک قفسه‌ی کامل شعر معاصر که کسی به آن دست نمی‌زند.',
      address: 'ونک، خیابان ملاصدرا، نبش کوچه‌ی شیراز، پلاک ۲۱',
      neighborhoodId: nb('vanak'),
      contactInfo: '۰۲۱-۸۸۲۲۳۳۴۴',
      verificationStatus: 'approved',
      createdAt: ago(now, 260),
    },
    {
      id: ven('phoenix'),
      ownerUserId: u('92'),
      businessName: 'سینما کلوپ ققنوس',
      description: 'نمایش فیلم‌های مستقل و کلاسیک، با نقد و گفت‌وگو بعد از هر نمایش.',
      address: 'عباس‌آباد، خیابان شهید بهشتی، پلاک ۱۴۵، طبقه‌ی دوم',
      neighborhoodId: nb('abbasabad'),
      contactInfo: '۰۲۱-۸۸۹۹۰۰۱۱',
      verificationStatus: 'approved',
      createdAt: ago(now, 210),
    },
  ];
}

/* -------------------------------------------------------------- activities */

interface ActivitySeed {
  n: string;
  author: string;
  kind: 'user' | 'venue';
  venue?: string;
  title: string;
  description: string;
  categories: string[];
  day: number;
  hour: number;
  neighborhood: string;
  precision: 'exact' | 'neighborhood';
  address?: string;
  capacity?: number;
  status?: 'published' | 'cancelled' | 'draft';
  recurring?: boolean;
}

const ACTIVITY_SEEDS: ActivitySeed[] = [
  /* ---------------------------------------------------------- upcoming */
  {
    n: '01',
    author: '01',
    kind: 'user',
    title: 'شب دی‌اند‌دی برای تازه‌کارها',
    description:
      'یک ماجرای کوتاه سه‌ساعته برای کسانی که تا حالا دی‌اند‌دی بازی نکرده‌اند. برگه‌ی شخصیت آماده می‌آورم، لازم نیست چیزی بلد باشید. فقط بیایید و به داستان اعتماد کنید.',
    categories: ['boardgames'],
    day: 3,
    hour: 19,
    neighborhood: 'yousefabad',
    precision: 'exact',
    address: 'یوسف‌آباد، خیابان چهلم، کافه رخ، طبقه‌ی همکف',
    capacity: 5,
  },
  {
    n: '02',
    author: '02',
    kind: 'user',
    title: 'صعود به توچال، صبح جمعه',
    description:
      'از ایستگاه یک تا ایستگاه پنج پیاده می‌رویم و با تله‌کابین برمی‌گردیم. سرعت متوسط، حدود چهار ساعت. کفش کوهنوردی الزامی است و آب کافی بردارید.',
    categories: ['hiking', 'sport'],
    day: 5,
    hour: 7,
    neighborhood: 'tajrish',
    precision: 'neighborhood',
    // Deliberately withheld even though an address exists in the poster's
    // draft — this is the INV-2 case, and the seed must contain it.
    address: 'تجریش، میدان قدس، جلوی ورودی تله‌کابین',
    capacity: 8,
  },
  {
    n: '03',
    author: '04',
    kind: 'user',
    title: 'کتاب‌خوانی: «سووشون» سیمین دانشور',
    description:
      'فصل‌های اول تا پنجم را خوانده‌ایم و درباره‌شان حرف می‌زنیم. اگر نخوانده‌اید هم بیایید، خلاصه‌اش را می‌گوییم. جلسه حدود دو ساعت طول می‌کشد.',
    categories: ['book-club'],
    day: 4,
    hour: 17,
    neighborhood: 'tajrish',
    precision: 'neighborhood',
    capacity: 10,
  },
  {
    n: '04',
    author: '05',
    kind: 'user',
    title: 'فوتبال شنبه شب، چمن مصنوعی',
    description:
      'هفت نفره. دو نفر کم داریم. زمین رزرو شده و هزینه بین همه تقسیم می‌شود، نفری حدود صد هزار تومان.',
    categories: ['sport'],
    day: 2,
    hour: 21,
    neighborhood: 'punak',
    precision: 'exact',
    address: 'پونک، بلوار میرزابابایی، مجموعه‌ی ورزشی آفتاب، زمین شماره‌ی ۲',
    capacity: 4,
  },
  {
    n: '05',
    author: '07',
    kind: 'user',
    title: 'شطرنج در کافه',
    description:
      'میز شطرنج می‌گذاریم و هرکس آمد بازی می‌کند. سطح مهم نیست، من خودم متوسطم. ساعت شطرنج دارم.',
    categories: ['chess'],
    day: 6,
    hour: 18,
    neighborhood: 'piroozi',
    precision: 'neighborhood',
    capacity: 6,
  },
  {
    n: '06',
    author: '08',
    kind: 'user',
    title: 'تبادل زبان انگلیسی — سطح متوسط',
    description:
      'یک ساعت فقط انگلیسی حرف می‌زنیم، بدون معلم و بدون کتاب. موضوع هر جلسه را قبلش اعلام می‌کنم. هدف روان شدن است نه درست حرف زدن.',
    categories: ['language-exchange'],
    day: 7,
    hour: 18,
    neighborhood: 'gisha',
    precision: 'exact',
    address: 'گیشا، خیابان سی‌وپنجم، کافه‌ی نقطه‌سرخط',
    capacity: 8,
  },
  {
    n: '07',
    author: '09',
    kind: 'user',
    title: 'کارگاه کوچک: شروع با تایپ‌اسکریپت',
    description:
      'برای کسانی که جاوااسکریپت بلدند و می‌خواهند تایپ‌اسکریپت را جدی شروع کنند. لپ‌تاپ بیاورید. رایگان است.',
    categories: ['tech'],
    day: 9,
    hour: 16,
    neighborhood: 'shahrak-gharb',
    precision: 'neighborhood',
    capacity: 12,
  },
  {
    n: '08',
    author: '10',
    kind: 'user',
    title: 'عکاسی خیابانی در بازار',
    description:
      'از سبزه‌میدان شروع می‌کنیم و تا تیمچه‌ی حاجب‌الدوله می‌رویم. هر دوربینی، حتی موبایل. آخرش یک چای می‌خوریم و عکس‌ها را نگاه می‌کنیم.',
    categories: ['art'],
    day: 8,
    hour: 9,
    neighborhood: 'bazar',
    precision: 'neighborhood',
    capacity: 7,
  },
  {
    n: '09',
    author: '11',
    kind: 'user',
    title: 'دوچرخه‌سواری دور دریاچه چیتگر',
    description: 'یک دور کامل دریاچه، حدود دوازده کیلومتر، سرعت آرام. دوچرخه کرایه‌ای هم هست.',
    categories: ['sport'],
    day: 6,
    hour: 8,
    neighborhood: 'chitgar',
    precision: 'exact',
    address: 'چیتگر، ضلع شمالی دریاچه، پارکینگ شماره‌ی ۳',
    capacity: 10,
  },
  {
    // The deliberately "ranked-down" activity for the default viewer (علی,
    // یوسف‌آباد, boardgames/chess): distant neighborhood AND no matching
    // interest. Ranking needs something to push down, and the empty-state
    // paths need to be reachable by filtering.
    n: '10',
    author: '12',
    kind: 'user',
    title: 'آشپزی گروهی: غذای شمالی',
    description:
      'میرزاقاسمی و باقالاقاتق می‌پزیم. مواد را من می‌خرم و هزینه‌اش را تقسیم می‌کنیم. آشپزخانه‌ی خانه‌ی من کوچک است، بیشتر از چهار نفر جا نمی‌شویم.',
    categories: ['food'],
    day: 10,
    hour: 15,
    neighborhood: 'tehransar',
    precision: 'neighborhood',
    capacity: 4,
  },
  {
    n: '11',
    author: '03',
    kind: 'user',
    title: 'شب بازی‌های ویدیویی رترو',
    description: 'کنسول قدیمی می‌آورم. مریوکارت، بمبرمن، و هرچه شما بیاورید.',
    categories: ['videogames'],
    day: 11,
    hour: 20,
    neighborhood: 'narmak',
    precision: 'neighborhood',
    capacity: 6,
  },
  {
    n: '12',
    author: '06',
    kind: 'user',
    title: 'تئاتر و نقد بعد از نمایش',
    description:
      'بلیت را خودتان جدا می‌گیرید. بعد از نمایش یک ساعت می‌نشینیم و درباره‌اش حرف می‌زنیم.',
    categories: ['theatre'],
    day: 12,
    hour: 19,
    neighborhood: 'abbasabad',
    precision: 'exact',
    address: 'عباس‌آباد، تئاتر شهر، سالن قشقایی',
    capacity: 6,
  },
  {
    n: '13',
    author: '02',
    kind: 'user',
    title: 'پیاده‌روی صبحگاهی در پارک آب و آتش',
    description: 'یک ساعت پیاده‌روی آرام و بعدش صبحانه. برای شروع روز عالی است.',
    categories: ['walk'],
    day: 1,
    hour: 7,
    neighborhood: 'vanak',
    precision: 'neighborhood',
    capacity: 12,
  },
  {
    n: '14',
    author: '07',
    kind: 'user',
    title: 'گروه مطالعه برای کنکور ارشد',
    description:
      'هفته‌ای دو بار، هر بار سه ساعت مطالعه‌ی ساکت با استراحت کوتاه. رشته مهم نیست، فقط نظم مهم است.',
    categories: ['study-group'],
    day: 2,
    hour: 16,
    neighborhood: 'piroozi',
    precision: 'exact',
    address: 'پیروزی، خیابان نبرد، کتابخانه‌ی عمومی شهید مطهری',
    capacity: 8,
  },
  {
    n: '15',
    author: '05',
    kind: 'user',
    title: 'دویدن گروهی، پنج کیلومتر',
    description: 'سرعت راحت، کسی جا نمی‌ماند. بعدش صبحانه در همان پارک.',
    categories: ['sport'],
    day: 4,
    hour: 7,
    neighborhood: 'punak',
    precision: 'neighborhood',
    capacity: 15,
  },

  /* ------------------------------------------------------------ venue */
  {
    n: '16',
    author: '90',
    kind: 'venue',
    venue: 'rokh',
    title: 'شب بازی رومیزی رخ — هر چهارشنبه',
    description:
      'هر چهارشنبه از ساعت هفت شب. میزهای باز برای کسانی که تنها می‌آیند، و یک بازی معرفی‌شده‌ی هفته که راهنمایش را خودمان توضیح می‌دهیم. ورودی رایگان است، فقط سفارش کافه.',
    categories: ['boardgames', 'cafe-event'],
    day: 3,
    hour: 19,
    neighborhood: 'yousefabad',
    precision: 'exact',
    address: 'یوسف‌آباد، خیابان سیدجمال‌الدین اسدآبادی، کوچه‌ی چهاردهم، پلاک ۸',
    capacity: 24,
    recurring: true,
  },
  {
    n: '17',
    author: '91',
    kind: 'venue',
    venue: 'hezartu',
    title: 'جلسه‌ی شعر معاصر',
    description: 'این هفته: فروغ. هرکس یک شعر می‌آورد و می‌خواند. ورودی رایگان.',
    categories: ['book-club', 'cafe-event'],
    day: 5,
    hour: 18,
    neighborhood: 'vanak',
    precision: 'exact',
    address: 'ونک، خیابان ملاصدرا، نبش کوچه‌ی شیراز، پلاک ۲۱',
    capacity: 20,
  },
  {
    n: '18',
    author: '92',
    kind: 'venue',
    venue: 'phoenix',
    title: 'نمایش فیلم: «خانه‌ی دوست کجاست؟»',
    description: 'نمایش نسخه‌ی ترمیم‌شده، و بعدش نقد و گفت‌وگو با حضور یک منتقد.',
    categories: ['cinema'],
    day: 7,
    hour: 20,
    neighborhood: 'abbasabad',
    precision: 'exact',
    address: 'عباس‌آباد، خیابان شهید بهشتی، پلاک ۱۴۵، طبقه‌ی دوم',
    capacity: 40,
  },

  /* ------------------------------------------------------------- past */
  {
    n: '19',
    author: '01',
    kind: 'user',
    title: 'شب مافیا',
    description: 'دوازده نفر، سه دور بازی. گرداننده خودم بودم.',
    categories: ['boardgames'],
    day: -7,
    hour: 20,
    neighborhood: 'yousefabad',
    precision: 'exact',
    address: 'یوسف‌آباد، خیابان چهلم، کافه رخ',
    capacity: 12,
  },
  {
    n: '20',
    author: '02',
    kind: 'user',
    title: 'کوهنوردی درکه تا شیرپلا',
    description: 'مسیر کلاسیک، حدود پنج ساعت رفت و برگشت. هوا عالی بود.',
    categories: ['hiking', 'sport'],
    day: -12,
    hour: 7,
    neighborhood: 'tajrish',
    precision: 'neighborhood',
    capacity: 10,
  },
  {
    n: '21',
    author: '04',
    kind: 'user',
    title: 'کافه‌گردی در خیابان انقلاب',
    description: 'سه کافه، یک بعدازظهر، و خرید کتاب بین راه.',
    categories: ['cafe-event', 'walk'],
    day: -18,
    hour: 16,
    neighborhood: 'jomhouri',
    precision: 'neighborhood',
    capacity: 6,
  },
  {
    n: '22',
    author: '09',
    kind: 'user',
    title: 'هم‌اندیشی استارتاپی',
    description: 'هرکس ده دقیقه درباره‌ی چیزی که می‌سازد حرف زد و بقیه سؤال پرسیدند.',
    categories: ['tech'],
    day: -20,
    hour: 17,
    neighborhood: 'shahrak-gharb',
    precision: 'exact',
    address: 'شهرک غرب، بلوار فرحزادی، مرکز نوآوری، سالن ۳',
    capacity: 15,
  },
  {
    n: '23',
    author: '10',
    kind: 'user',
    title: 'بازدید گروهی از نمایشگاه نقاشی',
    description: 'گالری‌گردی در خیابان کریم‌خان، چهار گالری در یک بعدازظهر.',
    categories: ['art'],
    day: -25,
    hour: 16,
    neighborhood: 'karimkhan',
    precision: 'neighborhood',
    capacity: 8,
  },
  {
    n: '24',
    author: '90',
    kind: 'venue',
    venue: 'rokh',
    title: 'مسابقه‌ی بازی رومیزی رخ',
    description: 'مسابقه‌ی ماهانه با جایزه‌ی کوچک. سی‌ودو نفر شرکت کردند.',
    categories: ['boardgames', 'cafe-event'],
    day: -15,
    hour: 18,
    neighborhood: 'yousefabad',
    precision: 'exact',
    address: 'یوسف‌آباد، خیابان سیدجمال‌الدین اسدآبادی، کوچه‌ی چهاردهم، پلاک ۸',
    capacity: 32,
  },

  /* -------------------------------------------------------- cancelled */
  {
    n: '25',
    author: '05',
    kind: 'user',
    title: 'والیبال ساحلی',
    description: 'زمین رزرو نشد، متأسفانه لغو شد. هفته‌ی بعد دوباره اعلام می‌کنم.',
    categories: ['sport'],
    day: 2,
    hour: 18,
    neighborhood: 'punak',
    precision: 'neighborhood',
    capacity: 8,
    status: 'cancelled',
  },
];

/**
 * A stable pseudo-point inside a neighborhood, for seed data only.
 *
 * This stands in for "the poster dropped a pin". It is a REAL coordinate in
 * the model's terms, so it is withheld from non-authors on approximate
 * activities exactly like a real one — the displayed circle comes from
 * `areaOf(neighborhoodId)`, never from this.
 *
 * Deterministic so a reload does not move a pin, and offset per activity so a
 * neighborhood's exact-precision pins do not stack.
 */
function seedPoint(neighborhoodSlug: string, salt: number): { lat: number; lng: number } {
  const n = NEIGHBORHOOD_BY_ID.get(nb(neighborhoodSlug));
  if (!n) return { lat: 35.6997, lng: 51.4015 };
  const angle = (salt * 137.5 * Math.PI) / 180;
  const offset = 0.004;
  return {
    lat: Number((n.center.lat + Math.sin(angle) * offset).toFixed(6)),
    lng: Number((n.center.lng + Math.cos(angle) * offset).toFixed(6)),
  };
}

function buildActivities(now: Date): Activity[] {
  return ACTIVITY_SEEDS.map((s, index) => ({
    id: a(s.n),
    authorId: u(s.author),
    authorKind: s.kind,
    title: s.title,
    description: s.description,
    categoryIds: s.categories.map(cat),
    startsAt: at(now, s.day, s.hour),
    /* Round-1 seed content is Tehran. */
    cityId: cty('tehran'),
    neighborhoodId: nb(s.neighborhood),
    locationPrecision: s.precision,
    status: s.status ?? 'published',
    // FR-56: written, inert, never read in Round 1.
    promotion: { sponsored: false },
    createdAt: ago(now, Math.max(1, 30 - Math.abs(s.day))),
    /* Every seeded activity gets a point, at BOTH precisions. That is the
     * realistic case and the one worth demoing: an approximate activity has a
     * real coordinate stored, and INV-5 is what stops it reaching anyone but
     * the author. Seeding points only for exact activities would make the
     * invariant look satisfied when it was merely untested. */
    coordinate: seedPoint(s.neighborhood, index),
    ...(s.address === undefined ? {} : { exactAddress: s.address }),
    ...(s.capacity === undefined ? {} : { capacity: s.capacity }),
    ...(s.venue === undefined ? {} : { venueId: ven(s.venue) }),
    ...(s.recurring
      ? { recurrence: { frequency: 'weekly' as const, daysOfWeek: [4] } }
      : {}),
  }));
}

/* ----------------------------------------------------------- connections */

interface RequestSeed {
  n: string;
  activity: string;
  requester: string;
  /** ⚠️ `'none'` is LEGACY — CR-07 made sharing mandatory and no NEW request
   *  can produce it. The rows below that use it are kept deliberately: they
   *  are the only proof the legacy render path still works (CR-07 Q3 `A`). */
  contact: 'none' | 'phone' | 'telegram';
  note?: string;
  withdrawn?: boolean;
  /** BR-U4-33 — 2 marks the one allowed re-request after a withdrawal. */
  seq?: 1 | 2;
}

/** Eighteen requests spanning upcoming and past activities, with all three
 *  share kinds represented — including several `none`, because "share nothing"
 *  has to be a real and visible option (FR-31), not a theoretical one. */
const REQUEST_SEEDS: RequestSeed[] = [
  { n: '01', activity: '01', requester: '03', contact: 'telegram', note: 'تا حالا بازی نکردم ولی خیلی دوست دارم شروع کنم.' },
  { n: '02', activity: '01', requester: '07', contact: 'phone', note: 'میزت جا داره؟' },
  { n: '03', activity: '01', requester: '12', contact: 'none', note: 'اگر جا بود خوشحال می‌شوم بیایم.' },
  { n: '04', activity: '02', requester: '11', contact: 'phone' },
  { n: '05', activity: '02', requester: '10', contact: 'none' },
  { n: '06', activity: '03', requester: '08', contact: 'telegram', note: 'کتاب را خوانده‌ام.' },
  { n: '07', activity: '04', requester: '03', contact: 'phone' },
  { n: '08', activity: '06', requester: '04', contact: 'telegram' },
  { n: '09', activity: '06', requester: '12', contact: 'none' },
  { n: '10', activity: '09', requester: '05', contact: 'phone' },
  { n: '11', activity: '16', requester: '01', contact: 'none' },
  { n: '12', activity: '05', requester: '01', contact: 'telegram', note: 'ساعت شطرنج خودم را هم می‌آورم.' },
  // Withdrawn: the contact is marked revoked, but US-33 is explicit that this
  // does not undo the disclosure — the poster may already have seen it.
  { n: '13', activity: '07', requester: '10', contact: 'phone', withdrawn: true },

  /* past activities — these are what make attendance and rating demoable */
  { n: '14', activity: '19', requester: '03', contact: 'telegram' },
  { n: '15', activity: '19', requester: '07', contact: 'phone' },
  { n: '16', activity: '19', requester: '06', contact: 'none' },
  { n: '17', activity: '20', requester: '11', contact: 'phone' },
  { n: '18', activity: '20', requester: '10', contact: 'telegram' },
];

function buildRequests(now: Date, users: User[]): JoinRequest[] {
  const byId = new Map(users.map((x) => [x.id, x]));

  return REQUEST_SEEDS.map((s, i) => {
    const requester = byId.get(u(s.requester));

    /* ⚠️ AN EMPTY VALUE IS NOT A CONTACT.
     *
     * `?? ''` produced `{ kind: 'telegram', value: '' }` for the two seeded
     * users who have no telegramId (محمد and شیما), and the inbox rendered that
     * as «تلگرام: » with nothing after it. That is worse than saying nothing was
     * shared: it CLAIMS a handle was disclosed and then shows a blank, so the
     * poster reads it as a loading failure and waits for a way to reach someone
     * that was never going to arrive. On the screen where you decide how to
     * contact a stranger, a blank is not a cosmetic defect.
     *
     * Degrading to `none` states what is actually true. Found by the INV-3
     * tests CR-05 added, not by review. */
    const declared =
      s.contact === 'phone'
        ? requester?.phone
        : s.contact === 'telegram'
          ? requester?.telegramId
          : undefined;

    const sharedContact =
      s.contact === 'none' || declared === undefined || declared === ''
        ? ({ kind: 'none' } as const)
        : s.contact === 'phone'
          ? ({ kind: 'phone', value: declared } as const)
          : ({ kind: 'telegram', value: declared } as const);

    return {
      id: RequestIdCodec.slug(s.n),
      activityId: a(s.activity),
      requesterId: u(s.requester),
      sharedContact,
      status: s.withdrawn ? ('withdrawn' as const) : ('sent' as const),
      contactRevoked: s.withdrawn === true,
      /* U4 / BR-U4-33 — seeded requests are all first attempts except the
       * re-request seeded deliberately below, so the terminal path is
       * reachable in a demo without setting it up by hand. */
      requestSeq: s.seq ?? 1,
      createdAt: ago(now, 30 - i),
      ...(s.note === undefined ? {} : { note: s.note }),
      ...(s.withdrawn ? { withdrawnAt: ago(now, 2) } : {}),
    };
  });
}

/**
 * Attendance on past activities only.
 *
 * Note the deliberate gaps: مریم (06) on activity 19 and شیما (10) on activity
 * 20 have NO attendance record at all. Absence means "not yet confirmed",
 * which is a different state from `attended: false` — the poster's UI must
 * show them as pending rather than as no-shows, and US-52 must refuse rating
 * for both. Without an unconfirmed case in the seed, that distinction would
 * never be visible in the running app.
 */
function buildAttendance(now: Date): Attendance[] {
  const confirmedAt = ago(now, 5);
  return [
    { activityId: a('19'), participantId: u('03'), attended: true, confirmedByUserId: u('01'), confirmedAt },
    { activityId: a('19'), participantId: u('07'), attended: true, confirmedByUserId: u('01'), confirmedAt },
    { activityId: a('20'), participantId: u('11'), attended: true, confirmedByUserId: u('02'), confirmedAt },
    { activityId: a('21'), participantId: u('08'), attended: true, confirmedByUserId: u('04'), confirmedAt },
    { activityId: a('22'), participantId: u('03'), attended: true, confirmedByUserId: u('09'), confirmedAt },
    { activityId: a('22'), participantId: u('01'), attended: true, confirmedByUserId: u('09'), confirmedAt },
    { activityId: a('23'), participantId: u('04'), attended: true, confirmedByUserId: u('10'), confirmedAt },
    // Confirmed ABSENT — said they would come and did not. Different from
    // having no record at all, and neither one may rate (US-52).
    { activityId: a('23'), participantId: u('06'), attended: false, confirmedByUserId: u('10'), confirmedAt },
    { activityId: a('24'), participantId: u('01'), attended: true, confirmedByUserId: u('90'), confirmedAt },
    { activityId: a('24'), participantId: u('03'), attended: true, confirmedByUserId: u('90'), confirmedAt },
    { activityId: a('24'), participantId: u('07'), attended: true, confirmedByUserId: u('90'), confirmedAt },
    { activityId: a('21'), participantId: u('12'), attended: false, confirmedByUserId: u('04'), confirmedAt },
  ];
}

/**
 * Ratings — EVERY ONE between the poster and a CONFIRMED attendee of the same
 * past activity (US-52, FR-44, FR-45).
 *
 * This is checked against the attendance table above by hand and, from U4
 * onward, by the rating-eligibility property test running over this very seed.
 */
function buildRatings(now: Date): Rating[] {
  const mk = (
    n: string,
    activity: string,
    rater: string,
    subject: string,
    score: number,
    comment?: string,
  ): Rating => ({
    id: RatingIdCodec.slug(n),
    activityId: a(activity),
    raterId: u(rater),
    subjectId: u(subject),
    score,
    createdAt: ago(now, 4),
    ...(comment === undefined ? {} : { comment }),
  });

  return [
    mk('01', '19', '01', '03', 5, 'خیلی خوب بازی کرد و سر وقت آمد.'),
    mk('02', '19', '03', '01', 5, 'گرداننده‌ی عالی بود.'),
    mk('03', '19', '01', '07', 4),
    mk('04', '19', '07', '01', 5),
    mk('05', '20', '02', '11', 5, 'همراه خوبی برای کوه.'),
    mk('06', '20', '11', '02', 5),
    mk('07', '21', '04', '08', 4),
    mk('08', '22', '09', '03', 4),
    mk('09', '22', '03', '09', 5, 'جلسه‌ی مفیدی بود.'),
    mk('10', '23', '10', '04', 5),
  ];
}

/* -------------------------------------------------------------- safety */

/** One block pair, so U6's filtering has something real to suppress from the
 *  very first run rather than only in a contrived test. */
function buildBlocks(now: Date): Block[] {
  return [{ blockerId: u('06'), blockedId: u('11'), createdAt: ago(now, 40) }];
}

function buildReports(now: Date): Report[] {
  return [
    {
      id: ReportIdCodec.slug('01'),
      reporterId: u('08'),
      subjectKind: 'user',
      subjectUserId: u('11'),
      reasonCode: 'harassment',
      // Because there is no in-app chat (AR-04), this free text is the ONLY
      // evidence moderation will ever have about off-platform abuse.
      detail: 'بعد از اینکه شماره‌ام را دادم، در تلگرام پیام‌های نامناسب فرستاد.',
      relatedActivityId: a('20'),
      status: 'open',
      createdAt: ago(now, 9),
    },
    {
      id: ReportIdCodec.slug('02'),
      reporterId: u('03'),
      subjectKind: 'activity',
      subjectActivityId: a('10'),
      reasonCode: 'fake_activity',
      detail: 'به نظر می‌رسد فقط برای گرفتن شماره‌ی آدم‌ها ساخته شده.',
      status: 'open',
      createdAt: ago(now, 6),
    },
  ];
}

/** Mixed read and unread, so the nav badge shows a non-zero count on the very
 *  first load — the badge is the product's only retention mechanism, and a
 *  demo where it is always zero hides that. */
function buildNotifications(now: Date): Notification[] {
  const mk = (
    n: string,
    userId: string,
    kind: Notification['kind'],
    payload: Record<string, string>,
    daysAgo: number,
    read: boolean,
  ): Notification => ({
    id: NotificationIdCodec.slug(n),
    userId: u(userId),
    kind,
    channel: 'in_app',
    // IDs only — never contact details (NFR-S1).
    payload,
    createdAt: ago(now, daysAgo),
    ...(read ? { readAt: ago(now, daysAgo - 0.5) } : {}),
  });

  return [
    mk('01', '01', 'request_received', { requestId: 'req_01', activityId: 'act_01' }, 3, false),
    mk('02', '01', 'request_received', { requestId: 'req_02', activityId: 'act_01' }, 2, false),
    mk('03', '01', 'request_received', { requestId: 'req_03', activityId: 'act_01' }, 1, false),
    mk('04', '01', 'attendance_due', { activityId: 'act_19' }, 6, false),
    mk('05', '01', 'rating_received', { activityId: 'act_19' }, 4, true),
    mk('06', '02', 'request_received', { requestId: 'req_04', activityId: 'act_02' }, 3, true),
    mk('07', '09', 'request_received', { requestId: 'req_13', activityId: 'act_07' }, 5, true),
    mk('08', '09', 'request_withdrawn', { requestId: 'req_13', activityId: 'act_07' }, 2, false),
  ];
}

/* ------------------------------------------------------------------ seed */

export function createSeed(now: Date = new Date()): StoreShape {
  const users = buildUsers(now);
  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    venues: buildVenues(now),
    activities: buildActivities(now),
    joinRequests: buildRequests(now, users),
    attendance: buildAttendance(now),
    ratings: buildRatings(now),
    reports: buildReports(now),
    blocks: buildBlocks(now),
    notifications: buildNotifications(now),
    /* U4 / BR-U4-36 — empty at seed. The courtesy quota accrues in use. */
    requestQuotas: [],
    activityViews: {
      act_16: 412,
      act_17: 188,
      act_18: 265,
      act_24: 530,
    },
    /* The default signed-in user for the prototype. علی lives in یوسف‌آباد and
     * likes board games, which is what makes the ranking demo legible: the
     * cooking activity out in تهرانسر should sink, and the board-game night
     * next door should rise. */
    currentUserId: u('01'),
    session: { userId: u('01'), startedAt: now.toISOString() },
  };
}
