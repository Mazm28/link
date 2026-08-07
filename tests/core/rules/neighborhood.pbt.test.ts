import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildGraph,
  FAR,
  MAX_HOPS,
  neighborhoodDistance,
  neighborhoodsWithin,
  validateGraph,
} from '@core/rules/neighborhood';
import { TEHRAN_NEIGHBORHOODS } from '@core/reference/tehran';
import { arbGraphWithTriple, arbNeighborhoodGraph } from '@tests/generators/graph';

/* Properties P-U1-07 … P-U1-11 — business-logic-model.md §6.3
 * Category: Invariant.
 *
 * Note the split: P-U1-08/09/11 run against GENERATED graphs, because they are
 * claims about the distance function. P-U1-07 and P-U1-10 run against the REAL
 * DATASET, because they are claims about hand-authored data — and the
 * generator builds only well-formed graphs, so it could never catch the drift
 * those two exist to catch. */

describe('adjacency dataset — real Tehran data', () => {
  it('P-U1-07 [Invariant] adjacency is symmetric across the whole dataset', () => {
    const violations = validateGraph(TEHRAN_NEIGHBORHOODS).filter(
      (v) => v.kind === 'asymmetric_edge',
    );
    expect(violations).toEqual([]);
  });

  it('P-U1-10 [Invariant] every neighborhood has >= 1 neighbour and exactly 1 district', () => {
    const violations = validateGraph(TEHRAN_NEIGHBORHOODS).filter(
      (v) => v.kind === 'isolated_node' || v.kind === 'missing_district',
    );
    // An isolated node would be unreachable from every feed — invisible to
    // anyone who does not already live there.
    expect(violations).toEqual([]);
  });

  it('[Invariant] every adjacency reference points at a neighborhood that exists', () => {
    const violations = validateGraph(TEHRAN_NEIGHBORHOODS).filter(
      (v) => v.kind === 'unknown_neighbour',
    );
    expect(violations).toEqual([]);
  });

  it('[Invariant] the real graph is connected within a usable number of hops', () => {
    // Not a hard requirement of the rules, but if the dataset were split into
    // disconnected islands, ranking by proximity would quietly stop working
    // for whole districts.
    const graph = buildGraph(TEHRAN_NEIGHBORHOODS);
    const first = TEHRAN_NEIGHBORHOODS[0]!;
    const reachable = neighborhoodsWithin(first.id, MAX_HOPS, graph);
    expect(reachable.size).toBeGreaterThan(1);
  });
});

describe('neighborhoodDistance — properties', () => {
  it('P-U1-11 [Invariant] distance(a, a) === 0', () => {
    fc.assert(
      fc.property(arbNeighborhoodGraph, (neighborhoods) => {
        const graph = buildGraph(neighborhoods);
        for (const n of neighborhoods) {
          expect(neighborhoodDistance(n.id, n.id, graph)).toBe(0);
        }
      }),
    );
  });

  it('P-U1-08 [Invariant] distance(a, b) === distance(b, a)', () => {
    fc.assert(
      fc.property(arbGraphWithTriple, ({ neighborhoods, a, b }) => {
        const graph = buildGraph(neighborhoods);
        expect(neighborhoodDistance(a, b, graph)).toBe(neighborhoodDistance(b, a, graph));
      }),
    );
  });

  it('P-U1-09 [Invariant] triangle inequality: d(a,c) <= d(a,b) + d(b,c)', () => {
    fc.assert(
      fc.property(arbGraphWithTriple, ({ neighborhoods, a, b, c }) => {
        const graph = buildGraph(neighborhoods);
        const ac = neighborhoodDistance(a, c, graph);
        const ab = neighborhoodDistance(a, b, graph);
        const bc = neighborhoodDistance(b, c, graph);
        expect(ac).toBeLessThanOrEqual(ab + bc);
      }),
    );
  });

  it('[Invariant] distance is bounded by FAR and never negative', () => {
    fc.assert(
      fc.property(arbGraphWithTriple, ({ neighborhoods, a, b }) => {
        const d = neighborhoodDistance(a, b, buildGraph(neighborhoods));
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(FAR);
      }),
    );
  });

  it('[Invariant] a direct edge means distance 1', () => {
    fc.assert(
      fc.property(arbNeighborhoodGraph, (neighborhoods) => {
        const graph = buildGraph(neighborhoods);
        for (const n of neighborhoods) {
          for (const other of n.adjacentIds) {
            expect(neighborhoodDistance(n.id, other, graph)).toBe(1);
          }
        }
      }),
    );
  });

  it('[Invariant] an unknown id is FAR, not an exception', () => {
    fc.assert(
      fc.property(arbNeighborhoodGraph, (neighborhoods) => {
        const graph = buildGraph(neighborhoods);
        const known = neighborhoods[0]!.id;
        const unknown = 'nbh_does_not_exist' as typeof known;
        // A stale reference should push an activity down the feed, never
        // break the feed.
        expect(neighborhoodDistance(known, unknown, graph)).toBe(FAR);
        expect(neighborhoodDistance(unknown, unknown, graph)).toBe(FAR);
      }),
    );
  });

  it('[Invariant] neighborhoodsWithin agrees with neighborhoodDistance', () => {
    fc.assert(
      fc.property(arbNeighborhoodGraph, (neighborhoods) => {
        const graph = buildGraph(neighborhoods);
        const origin = neighborhoods[0]!.id;
        const within = neighborhoodsWithin(origin, MAX_HOPS, graph);
        for (const [id, hops] of within) {
          expect(neighborhoodDistance(origin, id, graph)).toBe(hops);
        }
      }),
    );
  });
});
