import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { startOfTehranDay } from '@core/rules/jalali';
import type { ActivityFilters } from '@core/repositories';
import type { CategoryId, NeighborhoodId } from '@core/domain';

const DAY_MS = 86_400_000;

interface FeedFilterValue {
  query: string;
  setQuery: (value: string) => void;
  categoryId: CategoryId | null;
  setCategoryId: (id: CategoryId | null) => void;
  /** Start of the range, inclusive. Null means open-ended. */
  dateFrom: string | null;
  setDateFrom: (iso: string | null) => void;
  /** End of the range, inclusive of the whole day. Null means open-ended. */
  dateUntil: string | null;
  setDateUntil: (iso: string | null) => void;
  /** U3 — CR-01 change A, finally wired. */
  neighborhoodIds: NeighborhoodId[];
  setNeighborhoodIds: (ids: NeighborhoodId[]) => void;
  authorKind: 'user' | 'venue' | null;
  setAuthorKind: (kind: 'user' | 'venue' | null) => void;
  /** Composed filters, or undefined when nothing is narrowed. */
  filters: ActivityFilters | undefined;
  isFiltered: boolean;
  clear: () => void;
}

const FeedFilterContext = createContext<FeedFilterValue | null>(null);

/**
 * Filter state, lifted so the top bar can own search and categories while the
 * feed below consumes them.
 *
 * U3 replaces this with the real discovery feature. It lives at the app layer
 * for now because the search field is part of the shell chrome, and passing a
 * setter down through the router would couple the shell to the route.
 */
export function FeedFilterProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateUntil, setDateUntil] = useState<string | null>(null);
  const [neighborhoodIds, setNeighborhoodIds] = useState<NeighborhoodId[]>([]);
  const [authorKind, setAuthorKind] = useState<'user' | 'venue' | null>(null);

  /* The show-past toggle was REMOVED in U3 (BR-U3-42). Past activities have
   * left discovery, so `excludePast` is set by activityService for every
   * discovery read rather than being a user-facing choice. */

  const filters = useMemo<ActivityFilters | undefined>(() => {
    const parts: ActivityFilters = {};
    if (query.trim() !== '') parts.query = query;
    if (categoryId !== null) parts.categoryIds = [categoryId];

    /* Both ends are TEHRAN days, not UTC ones (BR-U1-17). Building the window
     * from UTC midnight would drop an evening activity from the day it belongs
     * to and add it to the next — Tehran is UTC+03:30, so anything after
     * 20:30 UTC has already rolled over. */

    if (dateFrom !== null) {
      // Inclusive: from the first moment of that Tehran day.
      parts.dateFrom = startOfTehranDay(new Date(dateFrom)).toISOString();
    }

    if (dateUntil !== null) {
      /* Inclusive of the WHOLE day, which is the whole point of an "until"
       * date. Using that day's midnight would make «از ۱۵ تا ۱۵» return
       * nothing, and «تا ۱۵» silently exclude everything on the 15th — the
       * user asked for a day, not for an instant. */
      const untilStart = startOfTehranDay(new Date(dateUntil));
      parts.dateTo = new Date(untilStart.getTime() + DAY_MS - 1).toISOString();
    }

    if (neighborhoodIds.length > 0) parts.neighborhoodIds = neighborhoodIds;
    if (authorKind !== null) parts.authorKind = authorKind;

    /* `excludePast` is NOT set here. Past activities left discovery entirely
     * (BR-U3-40), so activityService applies it to every discovery read — it
     * is a platform rule now, not a filter the user composes. */

    return Object.keys(parts).length === 0 ? undefined : parts;
  }, [query, categoryId, dateFrom, dateUntil, neighborhoodIds, authorKind]);

  const value: FeedFilterValue = {
    query,
    setQuery,
    categoryId,
    setCategoryId,
    dateFrom,
    /* Setting a start later than the existing end would leave the filter in a
     * state that can only return nothing. Rather than accept it and then
     * complain, the end moves with it — the user's most recent action is the
     * one they meant. The pickers also bound each other, so the invalid range
     * is hard to express in the first place. */
    setDateFrom: (iso) => {
      setDateFrom(iso);
      if (iso !== null && dateUntil !== null && new Date(iso).getTime() > new Date(dateUntil).getTime()) {
        setDateUntil(iso);
      }
    },
    dateUntil,
    setDateUntil: (iso) => {
      setDateUntil(iso);
      if (iso !== null && dateFrom !== null && new Date(iso).getTime() < new Date(dateFrom).getTime()) {
        setDateFrom(iso);
      }
    },
    neighborhoodIds,
    setNeighborhoodIds,
    authorKind,
    setAuthorKind,
    filters,
    isFiltered: filters !== undefined,
    clear: () => {
      setQuery('');
      setCategoryId(null);
      setDateFrom(null);
      setDateUntil(null);
      setNeighborhoodIds([]);
      setAuthorKind(null);
    },
  };

  return <FeedFilterContext.Provider value={value}>{children}</FeedFilterContext.Provider>;
}

export function useFeedFilters(): FeedFilterValue {
  const value = useContext(FeedFilterContext);
  if (!value) throw new Error('useFeedFilters must be used within FeedFilterProvider');
  return value;
}
