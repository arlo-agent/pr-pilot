import { describe, it, expect } from 'vitest';
import { cosineSimilarity, findSimilarPairs, clusterDuplicates } from '../src/core/similarity.js';
import type { EmbeddedItem, SimilarityResult } from '../src/core/types.js';

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

  it('handles non-unit vectors', () => {
    expect(cosineSimilarity([3, 4], [6, 8])).toBeCloseTo(1);
  });
});

describe('findSimilarPairs', () => {
  const items: EmbeddedItem[] = [
    { number: 1, type: 'pr', title: 'A', embedding: [1, 0, 0], textHash: 'a' },
    { number: 2, type: 'pr', title: 'B', embedding: [0.99, 0.1, 0], textHash: 'b' },
    { number: 3, type: 'issue', title: 'C', embedding: [0, 1, 0], textHash: 'c' },
  ];

  it('finds pairs above threshold', () => {
    const pairs = findSimilarPairs(items, 0.9);
    expect(pairs.length).toBe(1);
    expect(pairs[0].itemA).toBe(1);
    expect(pairs[0].itemB).toBe(2);
    expect(pairs[0].score).toBeGreaterThan(0.9);
  });

  it('returns empty for high threshold', () => {
    expect(findSimilarPairs(items, 0.999)).toHaveLength(0);
  });

  it('returns all pairs for low threshold', () => {
    const pairs = findSimilarPairs(items, -1);
    expect(pairs).toHaveLength(3); // C(3,2)=3
  });
});

describe('clusterDuplicates', () => {
  const items: EmbeddedItem[] = [
    { number: 1, type: 'pr', title: 'A', embedding: [1, 0], textHash: 'a' },
    { number: 2, type: 'pr', title: 'B', embedding: [1, 0], textHash: 'b' },
    { number: 3, type: 'issue', title: 'C', embedding: [1, 0], textHash: 'c' },
    { number: 4, type: 'pr', title: 'D', embedding: [0, 1], textHash: 'd' },
  ];

  it('groups transitively connected items', () => {
    const pairs: SimilarityResult[] = [
      { itemA: 1, itemB: 2, score: 0.95, typeA: 'pr', typeB: 'pr' },
      { itemA: 2, itemB: 3, score: 0.90, typeA: 'pr', typeB: 'issue' },
    ];
    const clusters = clusterDuplicates(pairs, items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].items).toHaveLength(3);
    const nums = clusters[0].items.map((i) => i.number).sort();
    expect(nums).toEqual([1, 2, 3]);
  });

  it('creates separate clusters for unconnected items', () => {
    const pairs: SimilarityResult[] = [
      { itemA: 1, itemB: 2, score: 0.95, typeA: 'pr', typeB: 'pr' },
      { itemA: 3, itemB: 4, score: 0.90, typeA: 'issue', typeB: 'pr' },
    ];
    const clusters = clusterDuplicates(pairs, items);
    expect(clusters).toHaveLength(2);
  });

  it('returns empty for no pairs', () => {
    expect(clusterDuplicates([], items)).toHaveLength(0);
  });
});
