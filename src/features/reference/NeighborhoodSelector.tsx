import { useMemo, useState } from 'react';
import type { CityId, DistrictId, NeighborhoodId } from '@core/domain';
import { t } from '@core/i18n';
import { normalizePersian } from '@core/rules/persianText';
import { TEHRAN_DISTRICTS } from '@core/reference/tehran';
import { cityId as makeCityId } from '@core/domain';
import { neighborhoodName, neighborhoodsOfCity } from '@core/reference/neighborhoods';
import { Button } from '@ui/Button';
import { Chip } from '@ui/Chip';
import { Input } from '@ui/Input';
import { Sheet } from '@ui/Sheet';

/* ===========================================================================
 * NeighborhoodSelector — frontend-components.md §7
 *
 * BUILT FOR REUSE. U3's filter panel needs multi-select over the same list
 * (US-21), so `mode` exists from the first commit. Retrofitting it later would
 * change the component's value type and every call site holding it — one prop
 * now, or a refactor in U3.
 *
 * THERE IS NO GEOLOCATION HERE, and there is none anywhere in this product
 * (CQ8 `B`, US-02). The neighborhood is CHOSEN. That is a privacy decision,
 * not a technical limitation, and it is why this component is a searchable
 * list rather than a "near me" button.
 * =========================================================================== */

type SingleProps = {
  mode?: 'single';
  value: NeighborhoodId | null;
  onChange: (id: NeighborhoodId | null) => void;
};

type MultipleProps = {
  mode: 'multiple';
  value: readonly NeighborhoodId[];
  onChange: (ids: NeighborhoodId[]) => void;
};

export type NeighborhoodSelectorProps = (SingleProps | MultipleProps) & {
  /**
   * REQUIRED. The list is scoped to this city.
   *
   * It used to read Tehran's 77 unconditionally, so composing an activity in
   * اصفهان offered یوسف‌آباد and تجریش — neighborhoods in a different city
   * entirely. Making the city a required prop means a caller cannot forget it.
   */
  cityId: CityId;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  'data-testid'?: string | undefined;
};

const TEHRAN_CITY_ID = makeCityId('tehran');

export function NeighborhoodSelector(props: NeighborhoodSelectorProps) {
  const { label, hint, error } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected: readonly NeighborhoodId[] =
    props.mode === 'multiple' ? props.value : props.value === null ? [] : [props.value];

  /* BR-U1-03 — the query is normalized with the SAME function used on the
   * names, so «يوسف اباد» typed with an Arabic yeh still finds «یوسف‌آباد». */
  const inCity = useMemo(() => neighborhoodsOfCity(props.cityId), [props.cityId]);

  const matches = useMemo(() => {
    const needle = normalizePersian(query);
    if (needle === '') return inCity;
    return inCity.filter((n) => normalizePersian(n.nameFa).includes(needle));
  }, [inCity, query]);

  const byDistrict = useMemo(() => {
    const groups = new Map<DistrictId, typeof matches>();
    for (const neighborhood of matches) {
      const bucket = groups.get(neighborhood.districtId) ?? [];
      groups.set(neighborhood.districtId, [...bucket, neighborhood]);
    }
    return groups;
  }, [matches]);

  function toggle(id: NeighborhoodId) {
    if (props.mode === 'multiple') {
      const next = selected.includes(id)
        ? selected.filter((existing) => existing !== id)
        : [...selected, id];
      props.onChange(next);
      return;
    }
    props.onChange(props.value === id ? null : id);
    setOpen(false);
  }

  const summary =
    selected.length === 0
      ? t('profile.neighborhoodChoose')
      : selected.map((id) => neighborhoodName(id) ?? '').join(t('common.listSeparator'));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-fg">{label}</span>

      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        data-testid="neighborhood-selector-trigger"
      >
        {summary}
      </Button>

      {hint !== undefined && <p className="text-xs text-fg-muted">{hint}</p>}
      {error !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="flex flex-col gap-4">
          <Input
            value={query}
            onChange={setQuery}
            label={t('profile.neighborhoodSearch')}
            data-testid="neighborhood-selector-search"
          />

          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">
              {t('profile.neighborhoodEmpty')}
            </p>
          ) : (
            <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
              {/* Tehran is grouped by district. The other four cities have no
               * district breakdown — their neighborhoods come from Divar's
               * listings, which do not carry one — so they render as a single
               * flat list rather than under 22 empty Tehran headings. */}
              {props.cityId !== TEHRAN_CITY_ID ? (
                <div className="flex flex-wrap gap-2">
                  {matches.map((neighborhood) => (
                    <Chip
                      key={neighborhood.id}
                      label={neighborhood.nameFa}
                      selected={selected.includes(neighborhood.id)}
                      onClick={() => toggle(neighborhood.id)}
                      data-testid={`neighborhood-selector-option-${neighborhood.id}`}
                    />
                  ))}
                </div>
              ) : (
                TEHRAN_DISTRICTS.map((district) => {
                  const items = byDistrict.get(district.id);
                  if (!items || items.length === 0) return null;

                  return (
                    <section key={district.id} className="flex flex-col gap-2">
                      <h3 className="text-xs font-medium text-fg-muted">{district.nameFa}</h3>
                      <div className="flex flex-wrap gap-2">
                        {items.map((neighborhood) => (
                          <Chip
                            key={neighborhood.id}
                            label={neighborhood.nameFa}
                            selected={selected.includes(neighborhood.id)}
                            onClick={() => toggle(neighborhood.id)}
                            data-testid={`neighborhood-selector-option-${neighborhood.id}`}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
