import { describe, it, expect } from 'vitest';
import { cosineSimilarity, findSimilarPairs, clusterDuplicates } from '../src/similarity.js';
import type { EmbeddedItem, SimilarityResult } from '../src/types.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it('computes correct similarity for arbitrary vectors', () => {
    // [1,2,3] · [4,5,6] = 32, |a|=√14, |b|=√77 → 32/√(14*77)
    const expected = 32 / Math.sqrt(14 * 77);
    expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(expected);
  });
});

function makeItem(number: number, embedding: number[], type: 'pr' | 'issue' = 'pr'): EmbeddedItem {
  return { number, type, title: `Item ${number}`, embedding, textHash: `hash-${number}` };
}

describe('findSimilarPairs', () => {
  it('returns empty for no items', () => {
    expect(findSimilarPairs([], 0.8)).toEqual([]);
  });

  it('returns empty for single item', () => {
    expect(findSimilarPairs([makeItem(1, [1, 0])], 0.8)).toEqual([]);
  });

  it('finds pairs above threshold', () => {
    const items = [
      makeItem(1, [1, 0]),
      makeItem(2, [0.99, 0.1]),  // very similar to item 1
      makeItem(3, [0, 1]),        // orthogonal
    ];
    const pairs = findSimilarPairs(items, 0.9);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].itemA).toBe(1);
    expect(pairs[0].itemB).toBe(2);
    expect(pairs[0].score).toBeGreaterThan(0.9);
  });

  it('returns no pairs when all below threshold', () => {
    const items = [makeItem(1, [1, 0]), makeItem(2, [0, 1])];
    expect(findSimilarPairs(items, 0.5)).toEqual([]);
  });

  it('preserves type information', () => {
    const items = [
      makeItem(1, [1, 0], 'pr'),
      makeItem(2, [1, 0.01], 'issue'),
    ];
    const pairs = findSimilarPairs(items, 0.9);
    expect(pairs[0].typeA).toBe('pr');
    expect(pairs[0].typeB).toBe('issue');
  });
});

describe('clusterDuplicates', () => {
  it('returns empty for no pairs', () => {
    expect(clusterDuplicates([], [])).toEqual([]);
  });

  it('creates a single cluster from one pair', () => {
    const items = [makeItem(1, [1, 0]), makeItem(2, [1, 0])];
    const pairs: SimilarityResult[] = [
      { itemA: 1, itemB: 2, score: 0.95, typeA: 'pr', typeB: 'pr' },
    ];
    const clusters = clusterDuplicates(pairs, items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].items).toHaveLength(2);
    expect(clusters[0].averageSimilarity).toBeCloseTo(1); // identical embeddings
  });

  it('merges transitive pairs into one cluster', () => {
    const items = [
      makeItem(1, [1, 0, 0]),
      makeItem(2, [0.9, 0.1, 0]),
      makeItem(3, [0.85, 0.15, 0]),
    ];
    const pairs: SimilarityResult[] = [
      { itemA: 1, itemB: 2, score: 0.95, typeA: 'pr', typeB: 'pr' },
      { itemA: 2, itemB: 3, score: 0.92, typeA: 'pr', typeB: 'pr' },
    ];
    const clusters = clusterDuplicates(pairs, items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].items).toHaveLength(3);
  });

  it('creates separate clusters for disconnected pairs', () => {
    const items = [
      makeItem(1, [1, 0]), makeItem(2, [1, 0]),
      makeItem(3, [0, 1]), makeItem(4, [0, 1]),
    ];
    const pairs: SimilarityResult[] = [
      { itemA: 1, itemB: 2, score: 0.95, typeA: 'pr', typeB: 'pr' },
      { itemA: 3, itemB: 4, score: 0.95, typeA: 'issue', typeB: 'issue' },
    ];
    const clusters = clusterDuplicates(pairs, items);
    expect(clusters).toHaveLength(2);
  });
});
