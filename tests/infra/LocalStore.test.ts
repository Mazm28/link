import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStore, SCHEMA_VERSION, type StoreShape } from '@infra/mock/LocalStore';

/* PBT-10 — example-based companions for the store lifecycle. */

const STORAGE_KEY = 'link.store';

const emptyStore = (): StoreShape => ({
  schemaVersion: SCHEMA_VERSION,
  users: [],
  venues: [],
  activities: [],
  joinRequests: [],
  attendance: [],
  ratings: [],
  reports: [],
  blocks: [],
  notifications: [],
  activityViews: {},
  currentUserId: null,
  session: null,
});

const seedFactory = () => {
  const s = emptyStore();
  s.currentUserId = 'usr_seeded';
  return s;
};

describe('LocalStore.load — BR-U1-40, 41, 44', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('BR-U1-41 — seeds and persists on first run', () => {
    const store = LocalStore.load(seedFactory);
    expect(store.read().currentUserId).toBe('usr_seeded');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(store.getDiagnostics().didResetOnVersionMismatch).toBe(false);
  });

  it('restores an existing store without reseeding', () => {
    const first = LocalStore.load(seedFactory);
    first.mutate((draft) => {
      draft.currentUserId = 'usr_changed';
    });

    const second = LocalStore.load(seedFactory);
    expect(second.read().currentUserId).toBe('usr_changed');
  });

  it('BR-U1-40 — resets to seed on a schema-version mismatch, and says so', () => {
    const stale = { ...emptyStore(), schemaVersion: SCHEMA_VERSION + 1, currentUserId: 'usr_old' };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

    const store = LocalStore.load(seedFactory);
    // No migration is attempted, on purpose: this is prototype data with no
    // real users, and migration code here would be discarded at Round 2.
    expect(store.read().currentUserId).toBe('usr_seeded');
    expect(store.getDiagnostics().didResetOnVersionMismatch).toBe(true);
  });

  it('treats corrupt data exactly like a version mismatch', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ not json');
    const store = LocalStore.load(seedFactory);
    expect(store.read().currentUserId).toBe('usr_seeded');
    expect(store.getDiagnostics().didResetOnVersionMismatch).toBe(true);
  });

  it('BR-U1-44 — falls back to memory when localStorage is unavailable', () => {
    // Private browsing, an exhausted quota, or a locked-down browser. This is
    // a supported degraded mode, not a defect: the app must stay usable and
    // only lose persistence across reloads.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const store = LocalStore.load(seedFactory);
    expect(store.getDiagnostics().usingMemoryFallback).toBe(true);
    expect(store.read().currentUserId).toBe('usr_seeded');

    // and it still works in memory
    store.mutate((draft) => {
      draft.currentUserId = 'usr_in_memory';
    });
    expect(store.read().currentUserId).toBe('usr_in_memory');
  });
});

describe('LocalStore.mutate — BR-U1-43', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists the whole store in one write', () => {
    const store = LocalStore.load(seedFactory);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    store.mutate((draft) => {
      draft.currentUserId = 'usr_a';
      draft.activityViews['act_1'] = 5;
    });

    // A partial write leaving the store internally inconsistent is worse than
    // a lost write, because the app would load successfully into a broken state.
    expect(setItem).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
  });

  it('does not let a caller mutate the snapshot in place', () => {
    const store = LocalStore.load(seedFactory);
    const snapshot = store.read();

    store.mutate((draft) => {
      draft.currentUserId = 'usr_b';
    });

    // The previous snapshot is untouched — mutate replaces state rather than
    // editing it, so a component holding an old reference cannot see a
    // half-applied change.
    expect(snapshot.currentUserId).toBe('usr_seeded');
    expect(store.read().currentUserId).toBe('usr_b');
  });

  it('notifies subscribers', () => {
    const store = LocalStore.load(seedFactory);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.mutate((draft) => {
      draft.currentUserId = 'usr_c';
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.mutate((draft) => {
      draft.currentUserId = 'usr_d';
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reset restores seed data', () => {
    const store = LocalStore.load(seedFactory);
    store.mutate((draft) => {
      draft.currentUserId = 'usr_changed';
    });
    store.reset(seedFactory);
    expect(store.read().currentUserId).toBe('usr_seeded');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
