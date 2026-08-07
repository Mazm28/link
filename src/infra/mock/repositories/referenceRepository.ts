import type { Category, District, InterestTag, Neighborhood } from '@core/domain';
import type { ReferenceDataRepository } from '@core/repositories';
import { TEHRAN_DISTRICTS, TEHRAN_NEIGHBORHOODS } from '@core/reference/tehran';
import { CATEGORIES, INTEREST_TAGS } from '@core/reference/taxonomy';
import { simulateLatency } from '../LocalStore';

/**
 * The one repository with no viewer parameter.
 *
 * Reference data is public, identical for every viewer, and cacheable
 * indefinitely. INV-4 is scoped to "user-visible content" precisely so this
 * exception can be explicit rather than an inconsistency — there is nothing
 * here that could vary by who is asking.
 */
export function createReferenceRepository(): ReferenceDataRepository {
  return {
    async listDistricts(): Promise<District[]> {
      await simulateLatency();
      return [...TEHRAN_DISTRICTS];
    },

    async listNeighborhoods(districtId?: string): Promise<Neighborhood[]> {
      await simulateLatency();
      return TEHRAN_NEIGHBORHOODS.filter(
        (n) => districtId === undefined || n.districtId === districtId,
      );
    },

    async listInterestTags(): Promise<InterestTag[]> {
      await simulateLatency();
      return [...INTEREST_TAGS];
    },

    async listCategories(): Promise<Category[]> {
      await simulateLatency();
      return [...CATEGORIES];
    },
  };
}
