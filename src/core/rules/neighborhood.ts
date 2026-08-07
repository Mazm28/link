import type { DistrictId, Neighborhood, NeighborhoodId } from '../domain';

/* ===========================================================================
 * Neighborhood proximity — business-rules.md §3 (BR-U1-20 … 25), Q1 `A`
 *
 * BR-U1-20: proximity is HOP DISTANCE IN AN UNDIRECTED ADJACENCY GRAPH. There
 * are no coordinates, no GPS, and no distance in kilometres anywhere in this
 * module or in the data it reads. That is not a simplification — it is the
 * second design principle of the product: the app never learns where a person
 * is, so "near" has to be expressible without knowing.
 * =========================================================================== */

/**
 * BR-U1-21 — beyond four neighborhoods away in Tehran, further precision has
 * no practical bearing on whether someone will actually show up. Traversal
 * stops here, which also keeps the cost stable as the dataset grows.
 */
export const MAX_HOPS = 4;

/** Returned for "unreachable, or further than MAX_HOPS". Deliberately one
 *  greater than the cap so it sorts last without special-casing. */
export const FAR = MAX_HOPS + 1;

export interface NeighborhoodGraph {
  adjacency: ReadonlyMap<NeighborhoodId, readonly NeighborhoodId[]>;
  districtOf: ReadonlyMap<NeighborhoodId, DistrictId>;
}

export function buildGraph(neighborhoods: readonly Neighborhood[]): NeighborhoodGraph {
  const adjacency = new Map<NeighborhoodId, readonly NeighborhoodId[]>();
  const districtOf = new Map<NeighborhoodId, DistrictId>();
  for (const n of neighborhoods) {
    adjacency.set(n.id, n.adjacentIds);
    districtOf.set(n.id, n.districtId);
  }
  return { adjacency, districtOf };
}

/**
 * BR-U1-21 / BR-U1-22 — bounded breadth-first search.
 *
 *   a === b              -> 0
 *   directly adjacent    -> 1
 *   reachable in n hops  -> n
 *   unreachable or > cap -> FAR
 *
 * An unknown id also returns FAR rather than throwing: a stale neighborhood
 * reference should push an activity down the feed, not break the feed.
 */
export function neighborhoodDistance(
  a: NeighborhoodId,
  b: NeighborhoodId,
  graph: NeighborhoodGraph,
): number {
  if (a === b) return graph.adjacency.has(a) ? 0 : FAR;
  if (!graph.adjacency.has(a) || !graph.adjacency.has(b)) return FAR;

  const visited = new Set<NeighborhoodId>([a]);
  let frontier: NeighborhoodId[] = [a];

  for (let depth = 1; depth <= MAX_HOPS; depth += 1) {
    const next: NeighborhoodId[] = [];
    for (const node of frontier) {
      for (const neighbour of graph.adjacency.get(node) ?? []) {
        if (neighbour === b) return depth;
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }

  return FAR;
}

/** Every neighborhood within `maxHops`, with its distance. Used by feed
 *  ranking in U3; exposed here so the traversal exists in exactly one place. */
export function neighborhoodsWithin(
  origin: NeighborhoodId,
  maxHops: number,
  graph: NeighborhoodGraph,
): Map<NeighborhoodId, number> {
  const result = new Map<NeighborhoodId, number>();
  if (!graph.adjacency.has(origin)) return result;

  result.set(origin, 0);
  let frontier: NeighborhoodId[] = [origin];
  const cap = Math.min(maxHops, MAX_HOPS);

  for (let depth = 1; depth <= cap; depth += 1) {
    const next: NeighborhoodId[] = [];
    for (const node of frontier) {
      for (const neighbour of graph.adjacency.get(node) ?? []) {
        if (!result.has(neighbour)) {
          result.set(neighbour, depth);
          next.push(neighbour);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return result;
}

export interface GraphViolation {
  kind: 'asymmetric_edge' | 'isolated_node' | 'unknown_neighbour' | 'missing_district';
  neighborhoodId: NeighborhoodId;
  otherId?: NeighborhoodId;
}

/**
 * BR-U1-23 / BR-U1-25 — dataset integrity.
 *
 * The adjacency graph is hand-authored, and a hand-authored graph drifts: an
 * edge gets added on one side and forgotten on the other, or a neighborhood
 * ends up with no neighbours at all and becomes unreachable from every feed.
 * This runs as a property test over the real dataset (P-U1-07, P-U1-10) rather
 * than only over generated graphs, because generated graphs are symmetric by
 * construction and would never catch the drift.
 */
export function validateGraph(neighborhoods: readonly Neighborhood[]): GraphViolation[] {
  const violations: GraphViolation[] = [];
  const byId = new Map(neighborhoods.map((n) => [n.id, n]));

  for (const n of neighborhoods) {
    if (n.adjacentIds.length === 0) {
      violations.push({ kind: 'isolated_node', neighborhoodId: n.id });
    }
    if (!n.districtId) {
      violations.push({ kind: 'missing_district', neighborhoodId: n.id });
    }
    for (const other of n.adjacentIds) {
      const target = byId.get(other);
      if (!target) {
        violations.push({ kind: 'unknown_neighbour', neighborhoodId: n.id, otherId: other });
        continue;
      }
      if (!target.adjacentIds.includes(n.id)) {
        violations.push({ kind: 'asymmetric_edge', neighborhoodId: n.id, otherId: other });
      }
    }
  }
  return violations;
}
