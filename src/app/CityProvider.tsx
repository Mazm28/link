import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CityId } from '@core/domain';
import { cityId } from '@core/domain';
import { CITY_BY_ID, IRAN_CITIES } from '@core/reference/cities';
import { useSession } from './SessionProvider';

const STORAGE_KEY = 'link.city';
const DEFAULT_CITY = cityId('tehran');

/** `null` means EVERY city — the default. */
export type ActiveCity = CityId | null;

const ALL_CITIES = 'all';

interface CityValue {
  /** `null` = all cities. The feed passes no city filter in that case. */
  cityId: ActiveCity;
  setCityId: (id: ActiveCity) => void;
  cityName: string;
  cities: typeof IRAN_CITIES;
  /** Somewhere concrete to POST to, even while browsing everywhere: the
   *  active city if one is chosen, else the viewer's home city, else Tehran. */
  composeCityId: CityId;
}

const CityContext = createContext<CityValue | null>(null);

/**
 * The active browsing city — BR-U3-50/51.
 *
 * DEFAULTS TO ALL CITIES. City-first browsing (CQ2 `A`) turned out to hide the
 * product: Round-1 content is almost entirely Tehran, so anyone who switched
 * city — or posted while switched — saw a feed with one activity in it and
 * reasonably concluded the app was broken. The city is now a FILTER a person
 * opts into, not a scope they are placed in without asking.
 *
 * Switching it still does NOT write to the profile: the same separation US-21
 * requires for the neighborhood filter, so looking elsewhere for an evening
 * does not silently rewrite where you say you live.
 */
export function CityProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [active, setActive] = useState<ActiveCity>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      /* An absent key means "never chosen" and yields ALL cities. Only the
       * explicit sentinel round-trips as all, so a stored real city still
       * restores. */
      if (stored === null || stored === ALL_CITIES) return null;
      return stored as CityId;
    } catch {
      return null;
    }
  });

  const value = useMemo<CityValue>(
    () => ({
      cityId: active,
      setCityId: (id: ActiveCity) => {
        setActive(id);
        try {
          window.localStorage.setItem(STORAGE_KEY, id === null ? ALL_CITIES : (id as string));
        } catch {
          /* A browser refusing storage should not break browsing. */
        }
      },
      cityName: active === null ? '' : (CITY_BY_ID.get(active)?.nameFa ?? ''),
      cities: IRAN_CITIES,
      composeCityId: active ?? user?.homeCityId ?? DEFAULT_CITY,
    }),
    [active, user?.homeCityId],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityValue {
  const value = useContext(CityContext);
  if (!value) throw new Error('useCity must be used within CityProvider');
  return value;
}
