/**
 * Reference-data pickers — city, neighborhood, interest.
 *
 * ⚠️ THESE LIVE HERE TO BREAK AN IMPORT CYCLE, and the cycle is worth
 * recording because it was invisible until the knowledge graph drew it:
 *
 *   activities/ActivityComposerScreen ─▶ features/identity (barrel)
 *                                          └─▶ identity/ProfileScreen
 *                                                └─▶ features/activities (barrel)
 *                                                      └─▶ ActivityComposerScreen
 *
 * The three selectors were built in `features/identity` because signup needed
 * them first, and U3 then imported them from there — the identity barrel even
 * said so: "Exported for U3's filter panel". That made `features/activities`
 * depend on `features/identity`. When CR-05 gave `ProfileScreen` an embedded
 * `MyActivitiesScreen`, the arrow closed into a loop.
 *
 * Nothing about these components is identity-specific: they import only
 * `core/domain`, `core/i18n`, `core/reference`, `core/rules/persianText` and
 * `ui/` primitives, and they know nothing about users, sessions or profiles.
 * They are pickers over reference data, and this is where reference-data
 * pickers belong.
 *
 * They cannot live in `ui/` — DEP-3 forbids `ui/` from importing
 * `@core/reference/**`, and these read the city, neighborhood and taxonomy
 * datasets by definition.
 *
 * ⚠️ This module must never import from `features/identity` or
 * `features/activities`. Doing so recreates the cycle from the other side.
 */
export { CitySelector } from './CitySelector';
export type { CitySelectorProps } from './CitySelector';
export { NeighborhoodSelector } from './NeighborhoodSelector';
export type { NeighborhoodSelectorProps } from './NeighborhoodSelector';
export { InterestSelector } from './InterestSelector';
export type { InterestSelectorProps } from './InterestSelector';
