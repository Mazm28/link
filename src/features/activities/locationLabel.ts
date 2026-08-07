import type { ActivityView } from '@core/domain';
import { t } from '@core/i18n';
import { cityName } from '@core/reference/cities';
import { neighborhoodName } from '@core/reference/neighborhoods';

/**
 * What to call an activity's place, for any viewer.
 *
 * Three cases, in order of what the viewer is entitled to:
 *   - an exact address they may see  -> the address
 *   - a neighborhood                 -> «حوالی {محله}»
 *   - a city with no neighborhoods   -> the city name
 *
 * Centralised so a new surface inherits the fallback rather than re-deriving
 * it — and so the «حوالی» form cannot accidentally be skipped for an activity
 * whose address is being withheld.
 */
export function locationLabel(activity: ActivityView): string {
  if (activity.exactAddress !== undefined) return activity.exactAddress;

  if (activity.neighborhoodId !== undefined) {
    const name = neighborhoodName(activity.neighborhoodId);
    if (name !== undefined) return t('location.around', { neighborhood: name });
  }

  return cityName(activity.cityId) ?? '';
}
