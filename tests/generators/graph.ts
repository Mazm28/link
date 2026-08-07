import fc from 'fast-check';
import { cityId,
  districtId, neighborhoodId, type Neighborhood } from '@core/domain';

/* ===========================================================================
 * PBT-07 — adjacency graph generator.
 *
 * Built as a random spanning tree plus extra edges, then symmetrized. The
 * spanning tree guarantees connectivity and that every node has at least one
 * neighbour, so generated graphs satisfy BR-U1-25 by construction.
 *
 * That is exactly why the symmetry and connectivity properties (P-U1-07,
 * P-U1-10) must ALSO run against the real hand-authored dataset: a generator
 * that cannot produce a broken graph cannot detect one.
 * =========================================================================== */

export const arbNeighborhoodGraph = fc
  .integer({ min: 2, max: 14 })
  .chain((size) =>
    fc
      .tuple(
        // parent[i] for i in 1..size-1, each pointing at an earlier node —
        // a uniformly shaped random tree.
        fc.tuple(...Array.from({ length: size - 1 }, (_, i) => fc.integer({ min: 0, max: i }))),
        // extra undirected edges beyond the tree
        fc.array(fc.tuple(fc.integer({ min: 0, max: size - 1 }), fc.integer({ min: 0, max: size - 1 })), {
          maxLength: size,
        }),
        // district assignment
        fc.tuple(...Array.from({ length: size }, () => fc.integer({ min: 1, max: 22 }))),
      )
      .map(([parents, extras, districts]): Neighborhood[] => {
        const ids = Array.from({ length: size }, (_, i) => neighborhoodId(`n${i}`));
        const adj = Array.from({ length: size }, () => new Set<number>());

        const link = (a: number, b: number) => {
          if (a === b) return;
          adj[a]?.add(b);
          adj[b]?.add(a);
        };

        parents.forEach((parent, idx) => link(idx + 1, parent));
        extras.forEach(([a, b]) => link(a, b));

        return ids.map((id, i) => ({
          id,
          nameFa: `محله ${i}`,
          districtId: districtId(String(districts[i] ?? 1).padStart(2, '0')),
          /* U3 fields. The graph generator is about ADJACENCY, so geography is
           * held constant — a fixed centre keeps generated cases comparable and
           * keeps this file about the property it exists for. */
          cityId: cityId('tehran'),
          center: { lat: 35.7, lng: 51.4 },
          radiusMeters: 900,
          adjacentIds: [...(adj[i] ?? [])].map((j) => ids[j]!),
        }));
      }),
  );

/** A graph plus three node ids drawn from it, for the triangle inequality. */
export const arbGraphWithTriple = arbNeighborhoodGraph.chain((neighborhoods) =>
  fc
    .tuple(
      fc.integer({ min: 0, max: neighborhoods.length - 1 }),
      fc.integer({ min: 0, max: neighborhoods.length - 1 }),
      fc.integer({ min: 0, max: neighborhoods.length - 1 }),
    )
    .map(([i, j, k]) => ({
      neighborhoods,
      a: neighborhoods[i]!.id,
      b: neighborhoods[j]!.id,
      c: neighborhoods[k]!.id,
    })),
);
