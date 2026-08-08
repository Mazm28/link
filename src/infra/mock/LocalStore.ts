import type {
  Activity,
  Attendance,
  Block,
  JoinRequest,
  Notification,
  Rating,
  Report,
  RequestQuota,
  Session,
  User,
  Venue,
} from '@core/domain';
import { DefectError } from '@core/errors';

/* ===========================================================================
 * Mock persistence — business-rules.md §5 (BR-U1-40 … 45), Design Q7 `A`
 *
 * This is prototype storage, not a database. It exists so the Round-1
 * prototype feels real — actions survive a reload — and so that the seam
 * between "screens" and "data" is exercised from the first commit rather than
 * discovered in Round 2.
 * =========================================================================== */

/** Bumped whenever the shape of StoreShape changes. See BR-U1-40.
 *  v2 (U2): User gained `avatarId`, `profileCompletedAt`, `safetyGuidanceSeenAt`;
 *  `displayName` and `homeNeighborhoodId` became optional; the store gained a
 *  `session` slot.
 *  v3 (U3): Activity gained `coordinate`; Neighborhood gained `cityId`,
 *  `center` and `radiusMeters`. A reset is REQUIRED rather than incidental —
 *  seeded activities without coordinates would render an empty map. */
export const SCHEMA_VERSION = 3;

const STORAGE_KEY = 'link.store';

export interface StoreShape {
  schemaVersion: number;
  users: User[];
  venues: Venue[];
  activities: Activity[];
  joinRequests: JoinRequest[];
  attendance: Attendance[];
  ratings: Rating[];
  reports: Report[];
  blocks: Block[];
  notifications: Notification[];
  /** Venue metrics (FR-55). Counts only — never viewer identity. */
  activityViews: Record<string, number>;
  /** U4 / BR-U4-36 — per-user, per-Tehran-day join-request counts.
   *  ⚠️ A courtesy limit, not a security control. See `RequestQuota`.
   *  Additive: an older store simply has none, which reads as an empty quota. */
  requestQuotas: RequestQuota[];
  /** The signed-in user. Mocked auth in Round 1; real sessions in Round 2. */
  currentUserId: string | null;
  /**
   * U2 — the session record itself.
   *
   * Kept ALONGSIDE `currentUserId` rather than replacing it: `currentUserId`
   * is what every repository already reads to answer "who is asking", while
   * `session` is what AuthRepository owns. Collapsing them would make the
   * auth layer's concern reach into seven repositories.
   */
  session: Session | null;
}

export interface StoreDiagnostics {
  /** BR-U1-44 — localStorage was unavailable, so the store is in memory only. */
  usingMemoryFallback: boolean;
  /** BR-U1-40 — the stored data was written by a different schema version and
   *  was reset to seed. Surfaced in the dev menu, not to end users. */
  didResetOnVersionMismatch: boolean;
}

type Listener = () => void;

/**
 * BR-U1-45 — simulated latency, 150–300 ms jittered.
 *
 * This is not decoration. NFR-U5 requires a loading, empty, and error state on
 * every async surface; with an instant mock those states never render long
 * enough to be seen, reviewed, or tested, and would break unnoticed until
 * Round 2 introduced real latency. Tests set MOCK_LATENCY=0 so the suite does
 * not pay for it.
 */
const LATENCY_MIN_MS = 150;
const LATENCY_MAX_MS = 300;

let latencyEnabled = readLatencyDefault();

function readLatencyDefault(): boolean {
  if (typeof process !== 'undefined' && process.env?.['MOCK_LATENCY'] === '0') return false;
  return true;
}

export function setMockLatencyEnabled(enabled: boolean): void {
  latencyEnabled = enabled;
}

export function isMockLatencyEnabled(): boolean {
  return latencyEnabled;
}

export async function simulateLatency(): Promise<void> {
  if (!latencyEnabled) return;
  const ms = LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------- persistence */

function storageAvailable(): boolean {
  try {
    const probe = '__link_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing, a full quota, or a locked-down browser. Not a defect —
    // a supported degraded mode.
    return false;
  }
}

/**
 * Serialize the store.
 *
 * JSON.stringify omits keys whose value is `undefined`, so an absent optional
 * field stays absent through a round trip and never becomes `null`. That is
 * exactly what P-U1-13 pins, and it matters more than it looks: INV-2 depends
 * on `exactAddress` being an ABSENT KEY. A serializer that turned absent into
 * `null` would weaken the location-privacy invariant while every other test
 * still passed.
 */
export function serialize(store: StoreShape): string {
  return JSON.stringify(store);
}

export function deserialize(raw: string): StoreShape {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new DefectError('mock store: parsed value is not an object');
  }
  return parsed as StoreShape;
}

export class LocalStore {
  private state: StoreShape;
  private readonly listeners = new Set<Listener>();
  private readonly diagnostics: StoreDiagnostics;
  private readonly canPersist: boolean;

  private constructor(state: StoreShape, diagnostics: StoreDiagnostics, canPersist: boolean) {
    this.state = state;
    this.diagnostics = diagnostics;
    this.canPersist = canPersist;
  }

  /**
   * BR-U1-40 / BR-U1-41 / BR-U1-44 — every branch ends in a usable app.
   *
   * A broken, absent, or stale store degrades to seeded data. None of them
   * degrades to a blank screen or a crash.
   */
  static load(seedFactory: () => StoreShape): LocalStore {
    const diagnostics: StoreDiagnostics = {
      usingMemoryFallback: false,
      didResetOnVersionMismatch: false,
    };

    if (!storageAvailable()) {
      diagnostics.usingMemoryFallback = true;
      return new LocalStore(seedFactory(), diagnostics, false);
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = seedFactory();
      const store = new LocalStore(seeded, diagnostics, true);
      store.persist();
      return store;
    }

    let parsed: StoreShape;
    try {
      parsed = deserialize(raw);
    } catch {
      // Corrupt data is treated exactly like a version mismatch: reset. There
      // is no user data here worth attempting to salvage.
      diagnostics.didResetOnVersionMismatch = true;
      const store = new LocalStore(seedFactory(), diagnostics, true);
      store.persist();
      return store;
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      /* No migration is attempted, on purpose. This is prototype data with no
       * real users, and migration code written here would be discarded when
       * Round 2 replaces the whole layer with a database. */
      diagnostics.didResetOnVersionMismatch = true;
      const store = new LocalStore(seedFactory(), diagnostics, true);
      store.persist();
      return store;
    }

    return new LocalStore(parsed, diagnostics, true);
  }

  getDiagnostics(): StoreDiagnostics {
    return { ...this.diagnostics };
  }

  /** Read-only snapshot. Callers must not mutate it; every write goes through
   *  `mutate` so persistence and notification cannot be skipped. */
  read(): Readonly<StoreShape> {
    return this.state;
  }

  /**
   * BR-U1-43 — writes are atomic per operation: the whole store is serialized
   * and written once. A partial write leaving the store internally
   * inconsistent — a rating whose activity is missing — is worse than a lost
   * write, because the app would then load successfully into a broken state.
   */
  mutate(recipe: (draft: StoreShape) => void): void {
    const next = deserialize(serialize(this.state));
    recipe(next);
    this.state = next;
    this.persist();
    this.notify();
  }

  reset(seedFactory: () => StoreShape): void {
    this.state = seedFactory();
    this.persist();
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    if (!this.canPersist) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(this.state));
    } catch {
      // Quota exhausted mid-session. The in-memory state is still correct, so
      // the app keeps working; only durability is lost.
      this.diagnostics.usingMemoryFallback = true;
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
