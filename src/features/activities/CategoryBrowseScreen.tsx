import { useQuery } from '@tanstack/react-query';
import { useCity } from '@app/CityProvider';
import { useSession } from '@app/SessionProvider';
import { useFeedFilters } from '@app/FeedFilterProvider';
import { t } from '@core/i18n';
import { toPersianDigits } from '@core/rules/persianText';
import { CATEGORIES } from '@core/reference/taxonomy';
import { Card } from '@ui/Card';
import { Skeleton } from '@ui/Skeleton';
import { useActivityService } from './useActivityServices';

/** CategoryBrowseScreen — US-24. Counts are city-scoped, like everything else
 *  in discovery (BR-U3-50). */
export function CategoryBrowseScreen() {
  const { user } = useSession();
  const { cityId } = useCity();
  const { setCategoryId } = useFeedFilters();
  const service = useActivityService();

  const { data, isLoading } = useQuery({
    queryKey: ['categories-browse', cityId],
    queryFn: () => service.getFeed({ viewer: user, cityId, mode: 'combined', limit: 200 }),
  });

  if (isLoading) return <Skeleton variant="card" lines={4} />;

  const items = data?.ok === true ? data.value.page.items : [];
  const countFor = (id: string) =>
    items.filter((a) => a.categoryIds.some((c) => (c as string) === id)).length;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-fg">{t('categories.title')}</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className="text-start"
            data-testid={`browse-category-${c.id}`}
          >
            <Card>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">
                  {c.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-fg">{c.nameFa}</span>
                  <span className="text-xs text-fg-muted">
                    {t('categories.count', { count: toPersianDigits(countFor(c.id as string)) })}
                  </span>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </section>
  );
}
