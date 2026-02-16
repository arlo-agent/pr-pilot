import { describe, it, expect } from 'vitest';
import { rankPRs } from '../src/core/ranker.js';
import type { GitHubPR, DuplicateCluster } from '../src/core/types.js';

function makePR(overrides: Partial<GitHubPR> & { number: number }): GitHubPR {
  return {
    title: `PR #${overrides.number}`,
    body: '',
    state: 'open',
    author: 'user',
    authorAssociation: 'NONE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    labels: [],
    reviewDecision: null,
    additions: 10,
    deletions: 10,
    changedFiles: 2,
    comments: 0,
    reviewComments: 0,
    commits: 1,
    filesChanged: [],
    draft: false,
    mergeable: null,
    headRef: 'feature',
    baseRef: 'main',
    ...overrides,
  };
}

function makeCluster(prNumbers: number[]): DuplicateCluster {
  return {
    id: 'cluster-0',
    items: prNumbers.map((n) => ({ number: n, type: 'pr' as const, title: `PR #${n}`, similarity: 0.9 })),
    bestItem: null,
    averageSimilarity: 0.9,
  };
}

describe('rankPRs', () => {
  it('ranks approved PR higher than unapproved', () => {
    const prs = [
      makePR({ number: 1, reviewDecision: null }),
      makePR({ number: 2, reviewDecision: 'APPROVED' }),
    ];
    const cluster = makeCluster([1, 2]);
    const ranked = rankPRs(prs, cluster);
    expect(ranked[0].number).toBe(2);
    expect(ranked[0].overallScore).toBeGreaterThan(ranked[1].overallScore);
  });

  it('ranks PR with tests higher', () => {
    const prs = [
      makePR({ number: 1, filesChanged: ['src/main.ts'] }),
      makePR({ number: 2, filesChanged: ['src/main.ts', 'tests/main.test.ts'] }),
    ];
    const cluster = makeCluster([1, 2]);
    const ranked = rankPRs(prs, cluster);
    expect(ranked[0].number).toBe(2);
  });

  it('ranks OWNER higher than NONE', () => {
    const prs = [
      makePR({ number: 1, authorAssociation: 'NONE' }),
      makePR({ number: 2, authorAssociation: 'OWNER' }),
    ];
    const cluster = makeCluster([1, 2]);
    const ranked = rankPRs(prs, cluster);
    expect(ranked[0].number).toBe(2);
  });

  it('returns empty for empty cluster', () => {
    const cluster = makeCluster([]);
    expect(rankPRs([], cluster)).toHaveLength(0);
  });

  it('handles single PR', () => {
    const prs = [makePR({ number: 1 })];
    const cluster = makeCluster([1]);
    const ranked = rankPRs(prs, cluster);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].overallScore).toBeGreaterThan(0);
  });

  it('ignores PRs not in cluster', () => {
    const prs = [makePR({ number: 1 }), makePR({ number: 2 })];
    const cluster = makeCluster([1]);
    const ranked = rankPRs(prs, cluster);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].number).toBe(1);
  });
});
