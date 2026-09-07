import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@ui/Button';
import { NeighborhoodSelector } from '@features/reference';
import { Chip } from '@ui/Chip';
import { JalaliDatePicker } from '@ui/JalaliDatePicker';
import { Sheet } from '@ui/Sheet';
import { toPersianDigits } from '@core/rules/persianText';
import { useI18n } from '../I18nProvider';
import { useRepositories } from '../RepositoryProvider';
import { useCity } from '../CityProvider';
import { useFeedFilters } from '../FeedFilterProvider';

/**
 * FilterPanel — CR-02 item 6.
 *
 * Every filter in one place, on the inline-START side of the feed. In an RTL
 * layout that is the RIGHT edge, which is what was asked for — and it is also
 * the leading edge, i.e. the RTL equivalent of a left sidebar rather than an
 * unusual position.
 *
 * The category chips used to live in the header as a scrolling strip. Two
 * problems with that: they were a filter sitting apart from the filters, and a
 * horizontal scroller hides most of eighteen options behind a swipe. Here they
 * wrap and are all visible at once.
 *
 * Two layouts, because one does not fit both. The primary target is a 375px
 * phone (requirements §9), where a persistent rail would take the width the
 * feed needs — so on small screens this collapses to a button with an
 * active-filter count that opens a sheet. The count matters: a collapsed panel
 * that hides which filters are on is how someone concludes the feed is broken.
 */
export function FilterPanel() {
  const { t } = useI18n();
  const repositories = useRepositories();
  const { cityId } = useCity();
  const [open, setOpen] = useState(false);

  const {
    categoryId,
    setCategoryId,
    dateFrom,
    setDateFrom,
    dateUntil,
    setDateUntil,
    neighborhoodIds,
    setNeighborhoodIds,
    authorKind,
    setAuthorKind,
    isFiltered,
    clear,
  } = useFeedFilters();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => repositories.reference.listCategories(),
  });

  const activeCount =
    (categoryId === null ? 0 : 1) +
    (dateFrom === null ? 0 : 1) +
    (dateUntil === null ? 0 : 1) +
    (neighborhoodIds.length === 0 ? 0 : 1) +
    (authorKind === null ? 0 : 1);

  const body = (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-text">{t('nav.categories')}</h3>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('nav.categories')}
          data-testid="app-shell-categories"
        >
          <Chip
            label={t('nav.allCategories')}
            selected={categoryId === null}
            onClick={() => setCategoryId(null)}
            data-testid="category-all"
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.nameFa}
              icon={category.icon}
              selected={categoryId === category.id}
              onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
              data-testid={`category-${String(category.id).replace('cat_', '')}`}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text">{t('demo.dateFilterHeading')}</h3>
        <JalaliDatePicker
          value={dateFrom}
          onChange={setDateFrom}
          label={t('demo.dateFrom')}
          previousMonthLabel={t('date.pickerPreviousMonth')}
          nextMonthLabel={t('date.pickerNextMonth')}
          closeLabel={t('action.close')}
          data-testid="date-from"
          {...(dateUntil === null ? {} : { maxDate: dateUntil })}
        />
        <JalaliDatePicker
          value={dateUntil}
          onChange={setDateUntil}
          label={t('demo.dateUntil')}
          previousMonthLabel={t('date.pickerPreviousMonth')}
          nextMonthLabel={t('date.pickerNextMonth')}
          closeLabel={t('action.close')}
          data-testid="date-until"
          {...(dateFrom === null ? {} : { minDate: dateFrom })}
        />
      </section>

      {/* The «نمایش فعالیت‌های برگزارشده» toggle was REMOVED here (BR-U3-42).
       * Past activities have left discovery entirely, so a control that
       * revealed them would offer exactly what the platform decided not to do.
       * Removing the control with the rule is the honest option; leaving it to
       * do nothing would be worse than never having built it. */}

      {/* U3 — the neighborhood filter, finally wired. The contract and the
       * read pipeline have supported it since U1; only the control was
       * missing (CR-01 change A). */}
      {/* Neighborhoods belong to a city, so this only makes sense once one is
        * chosen. Showing every city's محله‌ها at once would be a list nobody
        * can use. */}
      {cityId !== null && (
      <NeighborhoodSelector
        cityId={cityId}
        mode="multiple"
        value={neighborhoodIds}
        onChange={setNeighborhoodIds}
        label={t('activity.neighborhoodLabel')}
      />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">{t('filter.authorKind')}</legend>
        <div className="flex flex-wrap gap-2">
          <Chip
            label={t('filter.authorAny')}
            selected={authorKind === null}
            onClick={() => setAuthorKind(null)}
            data-testid="filter-author-any"
          />
          <Chip
            label={t('filter.authorUser')}
            selected={authorKind === 'user'}
            onClick={() => setAuthorKind(authorKind === 'user' ? null : 'user')}
            data-testid="filter-author-user"
          />
          <Chip
            label={t('filter.authorVenue')}
            selected={authorKind === 'venue'}
            onClick={() => setAuthorKind(authorKind === 'venue' ? null : 'venue')}
            data-testid="filter-author-venue"
          />
        </div>
      </fieldset>

      {isFiltered ? (
        <Button variant="ghost" size="sm" onClick={clear} data-testid="demo-clear-filters">
          {t('demo.dateFilterClear')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Phone: a button carrying the active count, opening a sheet. */}
      <div className="lg:hidden">
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          fullWidth
          data-testid="filter-panel-open"
        >
          {activeCount === 0
            ? t('demo.filtersOpen')
            : t('demo.filtersOpenCount', { count: toPersianDigits(activeCount) })}
        </Button>
        <Sheet open={open} onClose={() => setOpen(false)} title={t('demo.filtersTitle')}>
          {body}
        </Sheet>
      </div>

      {/* Wide screens: a docked rail. Logical properties throughout, so it
       * follows the writing direction instead of being pinned to a physical
       * side. */}
      <aside
        aria-label={t('demo.filtersTitle')}
        className="hidden lg:block lg:w-72 lg:shrink-0 lg:border-e lg:border-border lg:pe-5"
        data-testid="filter-panel"
      >
        {body}
      </aside>
    </>
  );
}
