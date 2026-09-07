# Frontend Components — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Functional Design, Unit U1
**Created**: 2026-07-30T04:20:00Z

Component hierarchy, props and state, interaction flows, and RTL conventions for U1's UI primitives and app shell.

---

## 1. RTL Conventions (US-90) — binding on every component

**FC-U1-01** — spacing, alignment, and positioning use **CSS logical properties only**:

| Never use                | Always use                                |
| ------------------------ | ----------------------------------------- |
| `margin-left` / `ml-4`   | `margin-inline-start` / `ms-4`            |
| `padding-right` / `pr-2` | `padding-inline-end` / `pe-2`             |
| `left` / `right`         | `inset-inline-start` / `inset-inline-end` |
| `text-align: left`       | `text-align: start`                       |
| `border-left`            | `border-inline-start`                     |

**Why this is a rule rather than a preference**: with logical properties, RTL correctness is the _default_ — a developer must actively write something wrong to break it. With physical properties, correctness depends on remembering to mirror every value, and one miss produces a subtly broken layout that reads as unfinished to a Persian user.

**FC-U1-02** — directional icons (arrows, chevrons, back) **mirror** under RTL. Non-directional icons (search, calendar, user) do **not**. A mirrored search icon looks broken; an unmirrored back-arrow points the wrong way.

**FC-U1-03** — the document root carries `dir="rtl"` and `lang="fa"`, set by `DirectionProvider`.

**FC-U1-04** — mixed Persian/Latin content (a Telegram ID inside a Persian sentence) is wrapped in `<bdi>` so bidirectional reordering does not scramble the surrounding text. This is the specific case that breaks most often in RTL interfaces.

**FC-U1-05** — no component contains a user-facing string literal. All copy resolves through the Persian catalogue by key (NFR-A5).

**FC-U1-06** — numbers in user-facing text render with **Persian digits**. Numbers in input fields accept both Persian and Latin digits and normalize on change (BR-U1-01).

---

## 2. `data-testid` Convention

Per the automation-friendly code rules:

**Format**: `{component}-{element-role}`, kebab-case, stable across renders.

| Example                        | Element                |
| ------------------------------ | ---------------------- |
| `jalali-date-picker-input`     | Date picker text input |
| `jalali-date-picker-day-15`    | A day cell             |
| `empty-state-action-button`    | Empty-state action     |
| `app-shell-nav-requests`       | Requests nav item      |
| `app-shell-nav-requests-badge` | Unread badge           |
| `toast-dismiss-button`         | Toast dismiss          |

**Rules**: never interpolate a random or generated ID; change a value only when the element's _purpose_ changes, not its styling or position.

---

## 3. UI Primitives (Q9 `A` — the 16 as listed)

### 3.1 Form Primitives

#### `Button`

```ts
props: {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;       // shows spinner, disables
  disabled?: boolean;
  fullWidth?: boolean;
  iconStart?: ReactNode;   // "start" not "left" - flips under RTL
  iconEnd?: ReactNode;
  onClick, children, 'data-testid'
}
state: none (controlled)
```

Minimum touch target 44×44 px (NFR-U2). `loading` implies `disabled` — a spinner that still accepts clicks causes duplicate submissions.

#### `Input`

```ts
props: {
  value: string; onChange: (v: string) => void;
  label: string;             // catalogue key
  error?: string;            // catalogue key; renders inline
  hint?: string;
  type?: 'text' | 'tel' | 'search';
  maxLength?: number;        // counted in code points, BR-U1-61
  normalizeDigits?: boolean; // default true for tel/search
  required?: boolean;
}
```

`normalizeDigits` converts Persian/Arabic-Indic digits to Latin on change, so a user typing `۰۹۱۲` produces a valid phone number.

#### `TextArea`

As `Input`, plus `rows`, `showCounter`. Counter uses Persian digits.

#### `Select`

```ts
props: { value, onChange, options: Array<{ value: string; labelKey: string }>, label, error?, placeholder? }
```

Dropdown opens aligned to the inline-start edge — visually right under RTL.

#### `Checkbox` / `RadioGroup`

Label sits inline-end of the control. Whole label is clickable.

### 3.2 Overlay Primitives

#### `Sheet` — bottom sheet, the primary mobile pattern

```ts
props: { open, onClose, title?: string, children, dismissible?: boolean }
state: internal animation state
```

Slides from the bottom (no directional concern). Focus trapped while open; `Escape` closes when `dismissible`. **`dismissible: false` exists specifically for U4's `JoinRequestSheet`**, where the disclosure must not be escapable by accident.

#### `Modal` / `Dialog`

`Dialog` is `Modal` plus a confirm/cancel action pair. Action buttons order: **confirm at inline-start, cancel at inline-end** — which places confirm on the right under RTL, matching Persian reading order.

### 3.3 Display Primitives

#### `Card`, `Badge`, `Avatar`, `Chip`

- `Card`: `interactive?` adds hover and press affordances
- `Badge`: `variant: 'default' | 'verified' | 'count'`; `count` renders Persian digits and caps at `+۹۹`
- `Avatar`: falls back to initials from `displayName` when no image
- `Chip`: `selected`, `onRemove?` — used for interest and category tags

#### `RatingStars`

```ts
props: { value: number | null; count?: number; readonly?: boolean; onChange?: (n: number) => void; size?: 'sm' | 'md' }
```

`value: null` renders "no ratings yet" rather than zero stars, per US-53. Star order fills from the inline-start edge.

### 3.4 State Primitives

#### `EmptyState`

```ts
props: { titleKey: string; messageKey?: string; action?: { labelKey: string; onClick: () => void }; illustration?: ReactNode }
```

**A first-class primitive, not an afterthought.** Per `personas.md`, P2 will see empty feeds constantly in early launch — the empty state is a common path and often the first impression, not an edge case (NFR-U5).

#### `LoadingState` / `Skeleton` / `ErrorState`

- `Skeleton` mirrors the shape of the content it replaces, reducing layout shift
- `ErrorState` shows a generic Persian message plus retry. **Never a stack trace** (NFR-S7)

#### `Toast`

```ts
props: { messageKey, variant: 'success' | 'error' | 'info', duration?: number, onDismiss }
```

Enters from the inline-end edge. Auto-dismisses; errors persist until dismissed.

### 3.5 `JalaliDatePicker` — the most involved primitive

```ts
props: {
  value: string | null;          // ISO-8601 UTC
  onChange: (iso: string | null) => void;
  minDate?: string;              // ISO
  maxDate?: string;
  includeTime?: boolean;
  label: string;
  error?: string;
}
state: {
  displayedJalaliMonth: { year: number; month: 1..12 };
  isOpen: boolean;
}
```

**Interaction flow**

```
1. User taps the input
2. Calendar opens on the month of `value`, or the current Tehran month if null
3. Grid renders Jalali weeks - week starts SATURDAY (شنبه), Persian day abbreviations
4. Month/year header shows Persian month name + Persian digits: "مرداد ۱۴۰۵"
5. Navigation chevrons MIRROR under RTL - "previous month" points inline-start
6. Days outside min/max are disabled
7. Selecting a day (and time, if enabled) converts Jalali -> Tehran local -> UTC ISO
8. onChange emits the ISO UTC string; the input shows the Jalali rendering
```

**Rules**

- Week begins **Saturday**, not Sunday or Monday. The Iranian week runs شنبه … جمعه, and getting this wrong makes the calendar unusable at a glance.
- Friday (جمعه) is visually marked as the weekend day.
- Month lengths follow BR-U1-12, including leap-year Esfand.
- Conversion at selection uses Tehran local midnight (BR-U1-17), so choosing "today" never lands on yesterday in UTC.
- Manual text entry accepts `۱۴۰۵/۰۵/۱۵` and `1405/05/15` alike, normalizing digits.

---

## 4. App Shell (`src/app/`)

### 4.1 Provider Composition

```
GlobalErrorBoundary
  └─ DirectionProvider          dir="rtl" lang="fa"
      └─ I18nProvider           Persian catalogue
          └─ RepositoryProvider ** the NFR-A1 seam **
              └─ QueryProvider  TanStack Query
                  └─ SessionProvider
                      └─ AppRouter
                          └─ AppShell
                              └─ <route content>
```

**Ordering rationale**: the error boundary is outermost so a provider failure still renders a Persian error rather than a blank page. `DirectionProvider` and `I18nProvider` come before `RepositoryProvider` so that even a data-layer failure renders its error message correctly localized and correctly oriented.

### 4.2 `RepositoryProvider`

```ts
interface Repositories {
  users: UserRepository;
  activities: ActivityRepository;
  connections: ConnectionRepository;
  venues: VenueRepository;
  safety: SafetyRepository;
  reference: ReferenceDataRepository;
}

props: {
  repositories: Repositories;
  children;
}
```

**The single point where the implementation is chosen.** `app/App.tsx` imports `infra/mock` and passes it in. **This is the only file in the application permitted to import from `infra/`** (DEP-2), enforced by ESLint.

**The swap test**: mount the app with a stub HTTP implementation instead. If any screen requires modification, NFR-A1 is violated and U1's definition of done is not met.

### 4.3 `AppShell`

```
+--------------------------------------------------+
|  Header: title, contextual action                |
+--------------------------------------------------+
|                                                  |
|  Route content                                   |
|                                                  |
+--------------------------------------------------+
|  Bottom nav: Feed | Search | Create | Requests(N) | Profile
+--------------------------------------------------+
```

Bottom navigation, mobile-first. Items ordered **right to left** under RTL — Feed sits rightmost. **The `Requests` item carries the unread badge**, which per `personas.md` is the product's only retention mechanism, so it must be visually prominent rather than subtle.

Venue accounts get a distinct dashboard shell at `/venue/*`, defined in U5.

### 4.4 `RoleGuard`

```ts
props: { allow: AccountType[]; children; fallback?: ReactNode }
```

Redirects rather than rendering when the current account type is not allowed. **Client-side gating is UX only** — the repository layer, not this component, is the enforcement boundary (NFR-S6).

### 4.5 `GlobalErrorBoundary`

Catches unhandled render errors, logs to console in development only, renders a generic Persian message with a reload action. **No stack trace, no internal path, no framework version reaches the user** (NFR-S7, SECURITY-09).

### 4.6 `DevMenu`

Reset and reseed the store, toggle mock latency, show schema-version warnings (BR-U1-40). **Excluded from production builds** via build-time flag — a reset control shipped to users would be a defect.

---

## 5. Async State Convention (NFR-U5)

Every async surface must handle **four** states. This is a checklist applied to every screen in U2 … U6, not a suggestion.

| State   | Component    | Rule                                                                             |
| ------- | ------------ | -------------------------------------------------------------------------------- |
| Loading | `Skeleton`   | Shaped like the eventual content                                                 |
| Empty   | `EmptyState` | Must explain _why_ it is empty and offer a next step — never a bare "no results" |
| Error   | `ErrorState` | Generic Persian message plus retry                                               |
| Success | content      | —                                                                                |

**Mock latency (BR-U1-45) exists to make this convention testable.** With an instant mock, loading states never render long enough to verify, and would silently break when Round 2 introduces real latency.

---

## 6. Component Inventory

| Component                                  | Type      | Props | State       | Properties (PBT)        |
| ------------------------------------------ | --------- | ----- | ----------- | ----------------------- |
| `Button`                                   | primitive | 9     | none        | none — presentational   |
| `Input`                                    | primitive | 10    | none        | none                    |
| `TextArea`                                 | primitive | 12    | none        | none                    |
| `Select`                                   | primitive | 6     | open        | none                    |
| `Checkbox`                                 | primitive | 5     | none        | none                    |
| `RadioGroup`                               | primitive | 5     | none        | none                    |
| `Sheet`                                    | primitive | 5     | animation   | none                    |
| `Modal`                                    | primitive | 4     | animation   | none                    |
| `Dialog`                                   | primitive | 7     | animation   | none                    |
| `Card`                                     | primitive | 4     | none        | none                    |
| `Badge`                                    | primitive | 3     | none        | none                    |
| `Avatar`                                   | primitive | 4     | none        | none                    |
| `Chip`                                     | primitive | 5     | none        | none                    |
| `JalaliDatePicker`                         | primitive | 8     | month, open | **inherits P-U1-04…06** |
| `EmptyState`                               | primitive | 4     | none        | none                    |
| `Skeleton` / `LoadingState` / `ErrorState` | primitive | 3     | none        | none                    |
| `RatingStars`                              | primitive | 6     | hover       | none                    |
| `Toast`                                    | primitive | 5     | timer       | none                    |
| `RepositoryProvider`                       | app       | 2     | none        | none — wiring           |
| `AppShell`                                 | app       | 1     | none        | none                    |
| `RoleGuard`                                | app       | 3     | none        | none                    |
| `GlobalErrorBoundary`                      | app       | 1     | error       | none                    |
| `DevMenu`                                  | app       | 0     | open        | none                    |

Per PBT-01, presentational components are **explicitly marked as having no identified properties** — they are covered by component tests instead. `JalaliDatePicker` is the exception: its conversion logic lives in `core/rules/jalali` and is property-tested there rather than through the component.

---

## 7. Integration Points

U1 has **no external system integrations** — the mock repository _is_ the boundary. Round 2 replaces `infra/mock` with `infra/http`; no component changes.

| Consumer       | Uses from U1                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- |
| U2 Identity    | `Input`, `Button`, `Select`, `Sheet`, `EmptyState`, `SessionProvider`, `UserRepository`           |
| U3 Activities  | `Card`, `Chip`, `JalaliDatePicker`, `Skeleton`, `EmptyState`, `ActivityRepository`                |
| U4 Connections | `Sheet` (with `dismissible: false`), `RadioGroup`, `RatingStars`, `Badge`, `ConnectionRepository` |
| U5 Venues      | All form primitives, `Card`, `Badge`, `VenueRepository`                                           |
| U6 Safety      | `Dialog`, `Select`, `TextArea`, `SafetyRepository`                                                |

---

**End of frontend components.**
