import { describe, expect, it } from 'vitest';
import { neighborhoodId, type Neighborhood } from '@core/domain';
import {
  buildGraph,
  FAR,
  MAX_HOPS,
  neighborhoodDistance,
  validateGraph,
} from '@core/rules/neighborhood';
import { TEHRAN_NEIGHBORHOODS } from '@core/reference/tehran';

/* PBT-10 — example-based companions. */

const n = (id: string, adjacent: string[]): Neighborhood => ({
  id: neighborhoodId(id),
  nameFa: id,
  districtId: 'dst_06' as Neighborhood['districtId'],
  cityId: 'cty_tehran' as Neighborhood['cityId'],
  center: { lat: 35.7, lng: 51.4 },
  radiusMeters: 900,
  adjacentIds: adjacent.map(neighborhoodId),
});

/*  a — b — c — d — e — f      a deliberate line, so hop counts are obvious  */
const LINE: Neighborhood[] = [
  n('a', ['b']),
  n('b', ['a', 'c']),
  n('c', ['b', 'd']),
  n('d', ['c', 'e']),
  n('e', ['d', 'f']),
  n('f', ['e']),
];

describe('neighborhoodDistance — BR-U1-21', () => {
  const graph = buildGraph(LINE);

  it('is 0 for the same neighborhood', () => {
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('a'), graph)).toBe(0);
  });

  it('is 1 for a direct neighbour', () => {
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('b'), graph)).toBe(1);
  });

  it('counts hops for an indirect route', () => {
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('c'), graph)).toBe(2);
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('e'), graph)).toBe(4);
  });

  it('caps at MAX_HOPS and reports FAR beyond it', () => {
    // a..f is five hops, one past the cap.
    expect(MAX_HOPS).toBe(4);
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('f'), graph)).toBe(FAR);
  });

  it('reports FAR for a disconnected neighborhood', () => {
    const island = buildGraph([...LINE, n('z', [])]);
    expect(neighborhoodDistance(neighborhoodId('a'), neighborhoodId('z'), island)).toBe(FAR);
  });
});

describe('validateGraph — BR-U1-23 / BR-U1-25', () => {
  it('accepts a well-formed graph', () => {
    expect(validateGraph(LINE)).toEqual([]);
  });

  it('detects an edge added on one side only', () => {
    // The exact drift a hand-authored dataset accumulates: someone adds
    // «a is next to c» and forgets the reverse.
    const drifted = [n('a', ['b', 'c']), n('b', ['a']), n('c', [])];
    const violations = validateGraph(drifted);
    expect(violations).toContainEqual({
      kind: 'asymmetric_edge',
      neighborhoodId: neighborhoodId('a'),
      otherId: neighborhoodId('c'),
    });
  });

  it('detects an isolated neighborhood', () => {
    const violations = validateGraph([n('a', ['b']), n('b', ['a']), n('z', [])]);
    expect(violations).toContainEqual({
      kind: 'isolated_node',
      neighborhoodId: neighborhoodId('z'),
    });
  });

  it('detects a reference to a neighborhood that does not exist', () => {
    const violations = validateGraph([n('a', ['ghost'])]);
    expect(violations.some((v) => v.kind === 'unknown_neighbour')).toBe(true);
  });
});

describe('real dataset sanity', () => {
  it('covers a meaningful portion of Tehran', () => {
    expect(TEHRAN_NEIGHBORHOODS.length).toBeGreaterThanOrEqual(60);
  });

  it('holds Persian names only — no transliteration is ever shown', () => {
    for (const neighborhood of TEHRAN_NEIGHBORHOODS) {
      expect(neighborhood.nameFa).toMatch(/[؀-ۿ]/u);
    }
  });
});
