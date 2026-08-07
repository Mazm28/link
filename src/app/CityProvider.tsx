import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CityId } from '@core/domain';
import { cityId } from '@core/domain';
import { CITY_BY_ID, IRAN_CITIES } from '@core/reference/cities';
import { useSession } from './SessionProvider';

const STORAGE_KEY = 'link.city';
const DEFAULT_CITY = cityId('tehran');

interface CityValue {
  cityId: CityId;
  setCityId: (id: CityId) => void;
  cityName: string;
  cities: typeof IRAN_CITIES;
}

const CityContext = createContext<CityValue | null>(null);

/**
 * The active browsing city — BR-U3-50/51.
 *
 * Precedence: an explicit local choice, then the viewer's `homeCityId`, then
 * Tehran. Switching it does NOT write to the profile: the same separation
 * US-21 already requires for the neighborhood filter, so looking elsewhere for
 * an evening does not silently rewrite where you say you live.
 */
export function CityProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [override, setOverride] = useState<CityId | null>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === null ? null : (stored as CityId);
    } catch {
      return null;
    }
  });

  const active = override ?? user?.homeCityId ?? DEFAULT_CITY;

  const value = useMemo<CityValue>(
    () => ({
      cityId: active,
      setCityId: (id: CityId) => {
        setOverride(id);
        try {
          window.localStorage.setItem(STORAGE_KEY, id as string);
        } catch {
          /* A browser refusing storage should not break browsing. */
        }
      },
      cityName: CITY_BY_ID.get(active)?.nameFa ?? '',
      cities: IRAN_CITIES,
    }),
    [active],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityValue {
  const value = useContext(CityContext);
  if (!value) throw new Error('useCity must be used within CityProvider');
  return value;
}
