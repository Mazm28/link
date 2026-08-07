/* ===========================================================================
 * Persian string catalogue — NFR-A5, NFR-L1, US-90
 *
 * Every user-facing string in the product lives here, keyed. ESLint fails the
 * build on a Persian literal appearing in `ui/`, `features/`, or `app/`, so
 * this is the only place copy can be written — which is what makes it
 * reviewable and editable in one pass rather than hunted for across 78
 * components.
 *
 * There is no language switcher and no second catalogue (NFR-L1). This is not
 * an i18n framework; it is one language, done properly.
 *
 * Keys are dot-namespaced by area. Values may carry {{placeholders}}.
 * =========================================================================== */

export const fa = {
  /* ------------------------------------------------------------- identity */
  'app.name': 'لینک',
  'app.tagline': 'فعالیت‌های اطرافت را پیدا کن',

  /* ---------------------------------------------------------- navigation */
  'nav.feed': 'خانه',
  'nav.search': 'جست‌وجو',
  'nav.create': 'ایجاد',
  'nav.requests': 'درخواست‌ها',
  'nav.profile': 'پروفایل',
  'nav.unreadCount': '{{count}} پیام خوانده‌نشده',
  'nav.categories': 'دسته‌بندی',
  'nav.searchPlaceholder': 'دنبال چه فعالیتی می‌گردی؟',
  'nav.allCategories': 'همه',

  /* ------------------------------------------------------- common actions */
  'action.save': 'ذخیره',
  'action.cancel': 'انصراف',
  'action.confirm': 'تأیید',
  'action.retry': 'تلاش دوباره',
  'action.close': 'بستن',
  'action.back': 'بازگشت',
  'action.edit': 'ویرایش',
  'action.delete': 'حذف',
  'action.search': 'جست‌وجو',
  'action.clear': 'پاک کردن',
  'action.more': 'بیشتر',

  /* -------------------------------------------------------- async states */
  'state.loading': 'در حال بارگذاری…',
  'state.error.title': 'مشکلی پیش آمد',
  /* NFR-S7 / BR-U1-53: generic on purpose. No stack trace, no internal path,
   * no store detail ever reaches a user. */
  'state.error.message': 'در حال حاضر نمی‌توانیم این بخش را نشان دهیم. لطفاً دوباره تلاش کنید.',
  'state.empty.generic.title': 'چیزی برای نمایش نیست',
  'state.empty.generic.message': 'هنوز موردی اینجا ثبت نشده است.',
  /* NFR-U5: an empty feed is a COMMON path in a new app in one city, and
   * often a first impression. It explains why it is empty and offers a step. */
  'state.empty.feed.title': 'فعلاً فعالیتی نیست',
  'state.empty.feed.message':
    'در محله‌های نزدیک تو هنوز فعالیتی ثبت نشده. می‌توانی اولین نفر باشی و یکی بسازی.',
  'state.empty.feed.action': 'ساختن فعالیت',
  'state.empty.search.title': 'نتیجه‌ای پیدا نشد',
  'state.empty.search.message': 'شاید با کلمه‌ی دیگری یا بدون فیلتر جست‌وجو کنی.',
  'state.empty.search.action': 'پاک کردن فیلترها',

  /* -------------------------------------------------------------- errors */
  'errors.nameInvalidLength': 'نام باید بین ۲ تا ۴۰ نویسه باشد.',
  'errors.bioTooLong': 'درباره‌ی من نباید بیشتر از ۲۰۰ نویسه باشد.',
  'errors.phoneInvalidFormat': 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹',
  'errors.telegramInvalidFormat': 'شناسه تلگرام باید بین ۵ تا ۳۲ نویسه و شامل حروف انگلیسی، عدد و _ باشد.',
  'errors.interestsRequired': 'حداقل یک علاقه‌مندی انتخاب کن.',
  'errors.neighborhoodInvalid': 'محله‌ی انتخاب‌شده معتبر نیست.',
  'errors.dateInvalid': 'تاریخ معتبر نیست.',
  'errors.dateOutOfRange': 'تاریخ خارج از محدوده‌ی پشتیبانی‌شده است.',
  'errors.notFound': 'موردی پیدا نشد.',
  'errors.forbidden': 'اجازه‌ی این کار را نداری.',
  'errors.storeUnavailable': 'اطلاعات در دسترس نیست.',

  /* ------------------------------------------------------- store notices */
  /* BR-U1-44: private browsing or a full quota. The app stays usable; only
   * persistence across reloads is lost, and the user is told plainly. */
  'store.memoryFallback.title': 'ذخیره‌سازی در دسترس نیست',
  'store.memoryFallback.message':
    'اطلاعات فقط تا زمانی که این صفحه باز است نگه داشته می‌شود و با بستن مرورگر پاک می‌شود.',
  'store.versionMismatch': 'نسخه‌ی داده‌های نمونه تغییر کرده و اطلاعات بازنشانی شد.',

  /* --------------------------------------------------------------- dates */
  'date.today': 'امروز',
  'date.tomorrow': 'فردا',
  /* One label for every card, whatever its state — a date is a date. Whether
   * an activity has already happened is carried by the badge and the muted
   * card treatment, not by relabelling the same field. */
  'date.heldOn': 'تاریخ برگزاری',
  'date.past': 'برگزار شده',
  'date.upcoming': 'پیش رو',
  'date.cancelled': 'لغو شده',
  'date.pickerLabel': 'انتخاب تاریخ',
  'date.pickerPreviousMonth': 'ماه قبل',
  'date.pickerNextMonth': 'ماه بعد',

  /* ------------------------------------------------------------- ratings */
  'rating.none': 'هنوز امتیازی ندارد',
  'rating.newMember': 'عضو تازه',
  'rating.summary': '{{average}} از ۵ — {{count}} نظر',
  'rating.attended': '{{count}} فعالیت شرکت کرده',

  /* -------------------------------------------------------------- venues */
  'venue.verified': 'تأییدشده',
  'venue.pending': 'در انتظار تأیید',

  /* ------------------------------------------------------------ location */
  'location.label': 'مکان',
  'location.exact': 'آدرس دقیق',
  'location.neighborhood': 'فقط محله',
  /* US-11 — «حوالی یوسف‌آباد».
   *
   * One word carries the whole idea: the activity is around there, and the
   * exact spot is not being published. It is ordinary Persian rather than a
   * notice about a setting, so a withheld address reads as how the host chose
   * to describe the place, not as something the app is refusing to show. */
  'location.around': 'حوالی {{neighborhood}}',

  /* --------------------------------------------------------------- theme */
  'theme.toDark': 'حالت شب',
  'theme.toLight': 'حالت روز',

  /* ------------------------------------------------------------ dev menu */
  'dev.title': 'ابزار توسعه',
  'dev.reset': 'بازنشانی داده‌های نمونه',
  'dev.toggleLatency': 'شبیه‌سازی تأخیر شبکه',
  'dev.schemaWarning': 'نسخه‌ی داده‌ها با نسخه‌ی برنامه یکی نیست.',

  /* ------------------------------------------- U1 foundation demo screen */
  'demo.title': 'بنیان — واحد ۱',
  'demo.subtitle': 'داده‌های نمونه، تاریخ جلالی، و جست‌وجوی فارسی',
  'demo.searchLabel': 'جست‌وجوی فعالیت‌ها',
  'demo.searchHint': 'با «بازي» یا «بازی» جست‌وجو کن — هر دو باید نتیجه بدهند.',
  'demo.datePickerLabel': 'یک تاریخ انتخاب کن',
  'demo.activityCount': '{{count}} فعالیت',
  'demo.showLoading': 'نمایش حالت بارگذاری',
  'demo.showError': 'نمایش حالت خطا',
  'demo.showEmpty': 'نمایش حالت خالی',
  'demo.showPast': 'نمایش فعالیت‌های برگزارشده',
  'demo.dateFrom': 'از تاریخ',
  'demo.dateUntil': 'تا تاریخ',
  'demo.dateFilterClear': 'پاک کردن فیلترها',
  'demo.dateFilterHeading': 'بازه‌ی تاریخ',
  'demo.filtersTitle': 'فیلترها',
  'demo.filtersOpen': 'فیلترها',
  'demo.filtersOpenCount': 'فیلترها ({{count}})',
  'demo.noPhoto': 'بدون تصویر',
  'demo.host': 'میزبان',
  'demo.detailTitle': 'جزئیات فعالیت',
  'demo.aboutActivity': 'درباره‌ی این فعالیت',
  'demo.capacity': 'ظرفیت',
  'demo.capacityValue': '{{count}} نفر',
  'demo.requests': '{{count}} درخواست',
  'demo.gallery': 'تصاویر',
  'demo.noGallery': 'برای این فعالیت تصویری ثبت نشده است.',

  /* ============================== U2 — IDENTITY AND PROFILE ============== */

  /* ------------------------------------------------------------ sign-in */
  'auth.phoneTitle': 'ورود به لینک',
  'auth.phoneSubtitle': 'شماره موبایلت را وارد کن تا کد ورود برایت بفرستیم.',
  'auth.phoneLabel': 'شماره موبایل',
  'auth.phonePlaceholder': '۰۹۱۲۳۴۵۶۷۸۹',
  'auth.phoneSubmit': 'ارسال کد',
  'auth.verifyTitle': 'کد ورود',
  'auth.verifySubtitle': 'کد پنج‌رقمی که برایت پیامک شد را وارد کن.',
  'auth.codeLabel': 'کد ورود',
  'auth.verifySubmit': 'ورود',
  'auth.resend': 'ارسال دوباره‌ی کد',
  'auth.resendIn': 'ارسال دوباره تا {{seconds}} ثانیه‌ی دیگر',
  'auth.changeNumber': 'تغییر شماره',
  'auth.safetyLink': 'راهنمای ایمنی را بخوان',

  /* ------------------------------------------------------ profile setup */
  'profile.setupTitle': 'پروفایلت را بساز',
  'profile.setupSubtitle': 'این‌ها را دیگران می‌بینند و کمک می‌کند فعالیت‌های مناسب‌تری ببینی.',
  'profile.nameLabel': 'نام نمایشی',
  'profile.namePlaceholder': 'مثلاً: سارا',
  'profile.avatarLabel': 'تصویر پروفایل',
  'profile.avatarNoName': '؟',
  'common.listSeparator': '، ',
  'profile.avatarNone': 'حرف اول نامم',
  'profile.bioLabel': 'درباره‌ی من',
  'profile.bioPlaceholder': 'یکی دو جمله درباره‌ی خودت (اختیاری)',
  'profile.bioCounter': '{{count}} از ۲۰۰',
  'profile.interestsLabel': 'علاقه‌مندی‌ها',
  'profile.interestsHint': 'حداقل یکی و حداکثر ده تا انتخاب کن.',
  'profile.interestsHintOptional': 'اختیاری است. تا ده تا می‌توانی انتخاب کنی و کمک می‌کند فعالیت‌های مرتبط‌تری ببینی.',
  'profile.cityLabel': 'شهر من (اختیاری)',
  'profile.cityHint': 'شهرت را خودت انتخاب می‌کنی؛ لینک هیچ‌وقت موقعیت مکانی دستگاهت را نمی‌خواند.',
  'profile.cityChoose': 'انتخاب شهر',
  'profile.citySearch': 'جست‌وجوی شهر',
  'profile.cityEmpty': 'شهری پیدا نشد.',
  'profile.cityNone': 'ترجیح می‌دهم نگویم',
  'profile.interestsCount': '{{selected}} از {{max}}',
  'profile.interestsAtMax': 'بیشتر از ده علاقه‌مندی نمی‌شود انتخاب کرد. برای انتخاب مورد تازه، یکی را بردار.',
  'profile.neighborhoodLabel': 'محله‌ی من',
  'profile.neighborhoodHint': 'محله‌ات را خودت انتخاب می‌کنی؛ لینک هیچ‌وقت موقعیت مکانی دستگاهت را نمی‌خواند.',
  'profile.neighborhoodSearch': 'جست‌وجوی محله',
  'profile.neighborhoodEmpty': 'محله‌ای پیدا نشد.',
  'profile.neighborhoodChoose': 'انتخاب محله',
  'profile.telegramLabel': 'شناسه‌ی تلگرام (اختیاری)',
  'profile.telegramPrivacy': 'این شناسه هیچ‌جا نمایش داده نمی‌شود. فقط اگر خودت هنگام ارسال درخواست انتخابش کنی، برای همان یک نفر فرستاده می‌شود.',
  'profile.setupSubmit': 'ادامه',
  'profile.editTitle': 'ویرایش پروفایل',
  'profile.editSave': 'ذخیره',
  'profile.editSaved': 'پروفایلت به‌روز شد.',
  'profile.editDiscardTitle': 'تغییرات ذخیره نشده',
  'profile.editDiscardBody': 'اگر بیرون بروی، تغییرهایی که داده‌ای از بین می‌رود.',
  'profile.editDiscardConfirm': 'بیرون برو',
  'profile.editDiscardCancel': 'برگرد و ذخیره کن',
  'profile.menuSafety': 'راهنمای ایمنی',
  'profile.menuEdit': 'ویرایش پروفایل',
  'profile.signOut': 'خروج از حساب',

  /* --------------------------------------------------- account deletion */
  'delete.entry': 'حذف حساب کاربری',
  'delete.title': 'حذف حساب کاربری',
  'delete.lead': 'پیش از ادامه، بدان که با حذف حساب چه اتفاقی می‌افتد:',
  'delete.point1': 'اطلاعات شخصی‌ات پاک می‌شود: نام، تصویر، درباره‌ی من و راه‌های تماس.',
  'delete.point2': 'فعالیت‌هایی که ساخته‌ای می‌مانند، اما بدون نام تو — تا سابقه‌ی کسانی که در آن‌ها شرکت کرده‌اند از بین نرود.',
  'delete.point3': 'راه‌های تماسی که قبلاً با کسی به اشتراک گذاشته‌ای، باطل می‌شود.',
  'delete.point4': 'همین حالا از حساب خارج می‌شوی.',
  'delete.point5': 'این کار قابل بازگشت نیست.',
  'delete.continue': 'ادامه',
  'delete.cancel': 'بی‌خیال',
  'delete.confirmTitle': 'مطمئنی؟',
  'delete.confirmBody': 'برای تأیید، واژه‌ی «حذف» را بنویس.',
  'delete.confirmWord': 'حذف',
  'delete.confirmLabel': 'تأیید حذف',
  'delete.confirmSubmit': 'حساب من را حذف کن',
  'delete.done': 'حساب کاربری‌ات حذف شد.',

  /* ----------------------------------------------------- safety guidance */
  'safety.title': 'راهنمای ایمنی',
  'safety.lead': 'لینک تو را به آدم‌های تازه وصل می‌کند. چند نکته‌ی ساده هست که خوب است همیشه رعایت کنی.',
  'safety.s1Title': 'جای شلوغ و عمومی قرار بگذار',
  'safety.s1Body': 'کافه، پارک، جایی که آدم‌های دیگر هم هستند. برای دیدار اول، خانه‌ی کسی یا جای خلوت نه.',
  'safety.s2Title': 'به یک نفر بگو کجا می‌روی',
  'safety.s2Body': 'به یک دوست یا یکی از خانواده بگو با چه کسی، کجا و چه ساعتی قرار داری. می‌توانی همان فعالیت را برایش بفرستی.',
  'safety.s3Title': 'می‌توانی گزارش بدهی یا مسدود کنی',
  'safety.s3Body': 'هر کسی، هر وقت، به هر دلیلی. مسدود کردن فوری انجام می‌شود و آن شخص خبردار نمی‌شود.',
  'safety.s4Title': 'لینک هویت کسی را تأیید نمی‌کند',
  'safety.s4Body': 'ما مدرک شناسایی نمی‌گیریم و سابقه‌ی کسی را بررسی نمی‌کنیم. هر پروفایل همان چیزی است که خود آن شخص نوشته. امتیازها از کسانی می‌آید که تأیید کرده‌اند همدیگر را دیده‌اند — کمک‌کننده است، اما مدرک نیست.',
  'safety.acknowledge': 'خواندم',
  'safety.readAnytime': 'هر وقت خواستی از منو می‌توانی دوباره این صفحه را ببینی.',

  /* ------------------------------------------------------- errors (U2) */
  'errors.otpInvalid': 'کد وارد‌شده درست نیست.',
  'errors.otpResendTooSoon': 'کمی صبر کن و بعد دوباره امتحان کن.',
  'errors.interestsTooMany': 'حداکثر ده علاقه‌مندی می‌توانی انتخاب کنی.',
  'errors.nameInvalidCharacters': 'نام باید دست‌کم یک حرف داشته باشد و نویسه‌های غیرمجاز نداشته باشد.',
  'errors.profileIncomplete': 'اول پروفایلت را کامل کن.',
  'errors.confirmationMismatch': 'واژه‌ی تأیید درست نیست.',
  'errors.cityInvalid': 'شهر انتخاب‌شده معتبر نیست.',

  /* ============================== U3 — ACTIVITIES AND DISCOVERY ========== */

  /* ------------------------------------------------------------ composer */
  'activity.createTitle': 'فعالیت تازه',
  'activity.editTitle': 'ویرایش فعالیت',
  'activity.titleLabel': 'عنوان',
  'activity.titlePlaceholder': 'مثلاً: پیاده‌روی صبحگاهی در پارک',
  'activity.descriptionLabel': 'توضیح',
  'activity.descriptionPlaceholder': 'چه کاری، برای چه کسانی، و چه انتظاری داشته باشند.',
  'activity.categoriesLabel': 'دسته‌بندی',
  'activity.categoriesHint': 'حداقل یکی انتخاب کن.',
  'activity.dateLabel': 'تاریخ و ساعت',
  'activity.timeLabel': 'ساعت',
  'activity.neighborhoodLabel': 'محله',
  'activity.capacityLabel': 'ظرفیت (اختیاری)',
  'activity.capacityHint': 'فقط برای اطلاع است؛ لینک جای کسی را نگه نمی‌دارد و درخواستی را رد نمی‌کند.',
  'activity.submit': 'انتشار',
  'activity.saveChanges': 'ذخیره‌ی تغییرات',
  'activity.cancelActivity': 'لغو فعالیت',
  'activity.cancelConfirmTitle': 'لغو این فعالیت؟',
  'activity.cancelConfirmBody': 'همه‌ی کسانی که درخواست داده‌اند باخبر می‌شوند و فعالیت از فهرست‌ها برداشته می‌شود.',
  'activity.cancelConfirm': 'بله، لغو کن',
  'activity.cancelKeep': 'بی‌خیال',
  'activity.pastEditNotice': 'این فعالیت برگزار شده. فقط توضیحش را می‌توانی تغییر دهی.',

  /* ------------------------------------------- location precision (US-11) */
  'activity.locationLabel': 'مکان فعالیت',
  'activity.precisionQuestion': 'مکان را چطور نشان بدهیم؟',
  'activity.precisionExact': 'نمایش موقعیت دقیق',
  'activity.precisionExactHelp': 'همه آدرس کامل را می‌بینند.',
  'activity.precisionApprox': 'نمایش موقعیت حدودی',
  'activity.precisionApproxHelp': 'فقط محله نشان داده می‌شود، نه آدرس.',
  'activity.addressLabel': 'آدرس دقیق',
  'activity.addressPlaceholder': 'خیابان، کوچه، پلاک',
  'activity.addressOnlyYou': 'این آدرس را فقط خودت می‌بینی.',
  'activity.pickOnMap': 'انتخاب روی نقشه',
  'activity.pickOnMapHint': 'اختیاری است. اگر نقطه‌ای انتخاب نکنی، فعالیت روی محدوده‌ی محله نشان داده می‌شود.',
  'activity.clearPoint': 'برداشتن نقطه',

  /* ---------------------------------------------------------------- feed */
  'feed.modeCombined': 'برای تو',
  'feed.modeNeighborhood': 'نزدیک من',
  'feed.modeInterest': 'علاقه‌مندی‌ها',
  'feed.fallbackNeighborhood': 'برای مرتب‌سازی بر اساس نزدیکی، محله‌ات را انتخاب کن. فعلاً فهرست عمومی را می‌بینی.',
  'feed.fallbackInterest': 'برای دیدن فعالیت‌های مرتبط، علاقه‌مندی‌هایت را انتخاب کن. فعلاً فهرست عمومی را می‌بینی.',
  'feed.fallbackAction': 'انتخاب کن',
  'feed.viewList': 'فهرست',
  'feed.viewMap': 'نقشه',
  'feed.count': '{{count}} فعالیت',
  'feed.emptyCity': 'هنوز در {{city}} فعالیتی ثبت نشده است.',
  'feed.emptyTitle': 'چیزی پیدا نشد',
  'feed.emptyBody': 'می‌توانی محله‌ی دیگری را امتحان کنی یا دسته‌بندی‌ها را ببینی.',

  /* ---------------------------------------------------------------- map */
  'map.legendExact': 'موقعیت دقیق',
  'map.legendApprox': 'موقعیت حدودی',
  'map.areaCount': '{{count}} فعالیت در این محله',
  'map.unavailable': 'نقشه در دسترس نیست. مکان‌ها به‌صورت نام محله نشان داده می‌شوند.',
  'map.openFull': 'نمایش روی نقشه',

  /* --------------------------------------------------------------- city */
  'city.switch': 'تغییر شهر',
  'city.current': 'شهر: {{city}}',

  /* ------------------------------------------------------- my activities */
  'my.title': 'فعالیت‌های من',
  'my.upcoming': 'پیش رو',
  'my.past': 'برگزارشده',
  'my.cancelled': 'لغوشده',
  'my.requestCount': '{{count}} درخواست',
  'my.emptyTitle': 'هنوز فعالیتی نساخته‌ای',
  'my.emptyBody': 'اولین فعالیتت را بساز تا دیگران پیدایش کنند.',
  'my.attendancePending': 'تأیید حضور انجام نشده',

  /* --------------------------------------------------------- categories */
  'categories.title': 'دسته‌بندی‌ها',
  'categories.count': '{{count}} فعالیت',

  /* ------------------------------------------------------------- detail */
  'detail.aboutHost': 'میزبان',
  'detail.share': 'هم‌رسانی',
  'detail.cancelled': 'این فعالیت لغو شده است.',
  'detail.past': 'این فعالیت برگزار شده است.',
  'activity.stateCancelled': 'لغو شده',
  'activity.statePast': 'برگزار شده',
  'filter.authorKind': 'برگزارکننده',
  'filter.authorAny': 'همه',
  'filter.authorUser': 'افراد',
  'filter.authorVenue': 'کسب‌وکارها',

  /* ------------------------------------------------------- errors (U3) */
  'errors.titleInvalidLength': 'عنوان باید بین ۳ تا ۸۰ نویسه باشد.',
  'errors.descriptionInvalidLength': 'توضیح باید بین ۱۰ تا ۲۰۰۰ نویسه باشد.',
  'errors.categoriesRequired': 'حداقل یک دسته‌بندی انتخاب کن.',
  'errors.dateInPast': 'تاریخ باید در آینده باشد.',
  'errors.dateTooFar': 'حداکثر تا دو ماه آینده می‌توانی فعالیت بگذاری.',
  'errors.precisionRequired': 'انتخاب کن که مکان دقیق نشان داده شود یا حدودی.',
  'errors.addressRequired': 'برای نمایش موقعیت دقیق، آدرس لازم است.',
  'errors.capacityInvalid': 'ظرفیت باید عددی بین ۲ تا ۵۰۰ باشد.',

} as const;

export type MessageKey = keyof typeof fa;
