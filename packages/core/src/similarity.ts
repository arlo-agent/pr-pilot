import type { EmbeddedItem, SimilarityResult, DuplicateCluster, ClusterItem } from './types.js';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function findSimilarPairs(
  items: EmbeddedItem[],
  threshold: number,
): SimilarityResult[] {
  const pairs: SimilarityResult[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const score = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (score >= threshold) {
        pairs.push({
          itemA: items[i].number,
          itemB: items[j].number,
          score,
          typeA: items[i].type,
          typeB: items[j].type,
        });
      }
    }
  }
  return pairs;
}

export function clusterDuplicates(
  pairs: SimilarityResult[],
  items: EmbeddedItem[],
): DuplicateCluster[] {
  // Union-Find
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (a: number, b: number) => {
    parent.set(find(a), find(b));
  };

  for (const pair of pairs) {
    union(pair.itemA, pair.itemB);
  }

  // Group by root
  const groups = new Map<number, Set<number>>();
  const involvedNumbers = new Set<number>();
  for (const pair of pairs) {
    involvedNumbers.add(pair.itemA);
    involvedNumbers.add(pair.itemB);
  }
  for (const num of involvedNumbers) {
    const root = find(num);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root)!.add(num);
  }

  const itemMap = new Map(items.map((i) => [i.number, i]));

  // Build clusters
  const clusters: DuplicateCluster[] = [];
  let clusterIdx = 0;
  for (const [, members] of groups) {
    if (members.size < 2) continue;

    // Calculate pairwise similarities within cluster
    const memberArr = [...members];
    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < memberArr.length; i++) {
      for (let j = i + 1; j < memberArr.length; j++) {
        const a = itemMap.get(memberArr[i]);
        const b = itemMap.get(memberArr[j]);
        if (a && b) {
          totalSim += cosineSimilarity(a.embedding, b.embedding);
          pairCount++;
        }
      }
    }
    const avgSim = pairCount > 0 ? totalSim / pairCount : 0;

    const clusterItems: ClusterItem[] = memberArr.map((num) => {
      const item = itemMap.get(num);
      return {
        number: num,
        type: item?.type ?? 'issue',
        title: item?.title ?? '',
        similarity: avgSim,
      };
    });

    clusters.push({
      id: `cluster-${clusterIdx++}`,
      items: clusterItems,
      bestItem: null,
      averageSimilarity: avgSim,
    });
  }

  return clusters;
}
