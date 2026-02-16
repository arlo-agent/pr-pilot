import { describe, it, expect } from 'vitest';
import { rankPRs } from '../src/ranker.js';
import type { GitHubPR, DuplicateCluster } from '../src/types.js';

function makePR(overrides: Partial<GitHubPR> & { number: number }): GitHubPR {
  return {
    title: `PR #${overrides.number}`,
    body: '',
    state: 'open',
    author: 'user',
    authorAssociation: 'CONTRIBUTOR',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    labels: [],
    reviewDecision: null,
    additions: 50,
    deletions: 20,
    changedFiles: 3,
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
  it('returns empty for empty cluster', () => {
    expect(rankPRs([], makeCluster([]))).toEqual([]);
  });

  it('returns empty when cluster has no matching PRs', () => {
    const prs = [makePR({ number: 1 })];
    expect(rankPRs(prs, makeCluster([99]))).toEqual([]);
  });

  it('ranks PRs by overall score descending', () => {
    const prs = [
      makePR({ number: 1, body: '', additions: 10, deletions: 0, authorAssociation: 'NONE' }),
      makePR({
        number: 2,
        body: '## Summary\nFixes #123\nThis is a detailed description that covers the changes.',
        authorAssociation: 'OWNER',
        reviewDecision: 'APPROVED',
        filesChanged: ['src/test.spec.ts'],
      }),
    ];
    const result = rankPRs(prs, makeCluster([1, 2]));
    expect(result).toHaveLength(2);
    expect(result[0].number).toBe(2); // better PR
    expect(result[0].overallScore).toBeGreaterThan(result[1].overallScore);
  });

  it('scores test coverage correctly', () => {
    const withTests = makePR({ number: 1, filesChanged: ['src/foo.test.ts'] });
    const withoutTests = makePR({ number: 2, filesChanged: ['src/foo.ts'] });
    const result = rankPRs([withTests, withoutTests], makeCluster([1, 2]));
    const s1 = result.find((r) => r.number === 1)!;
    const s2 = result.find((r) => r.number === 2)!;
    expect(s1.testCoverage).toBe(1);
    expect(s2.testCoverage).toBe(0);
  });

  it('scores description quality based on content', () => {
    const good = makePR({ number: 1, body: '## What\nFixes #42\n' + 'x'.repeat(500) });
    const bad = makePR({ number: 2, body: '' });
    const result = rankPRs([good, bad], makeCluster([1, 2]));
    const s1 = result.find((r) => r.number === 1)!;
    const s2 = result.find((r) => r.number === 2)!;
    expect(s1.descriptionQuality).toBeGreaterThan(s2.descriptionQuality);
  });

  it('scores author reputation correctly', () => {
    const owner = makePR({ number: 1, authorAssociation: 'OWNER' });
    const firstTimer = makePR({ number: 2, authorAssociation: 'FIRST_TIMER' });
    const result = rankPRs([owner, firstTimer], makeCluster([1, 2]));
    const s1 = result.find((r) => r.number === 1)!;
    const s2 = result.find((r) => r.number === 2)!;
    expect(s1.authorReputation).toBe(1.0);
    expect(s2.authorReputation).toBe(0.2);
  });

  it('ignores issue items in cluster', () => {
    const cluster: DuplicateCluster = {
      id: 'c',
      items: [
        { number: 1, type: 'pr', title: '', similarity: 0.9 },
        { number: 2, type: 'issue', title: '', similarity: 0.9 },
      ],
      bestItem: null,
      averageSimilarity: 0.9,
    };
    const prs = [makePR({ number: 1 })];
    const result = rankPRs(prs, cluster);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it('all scores are between 0 and 1', () => {
    const pr = makePR({ number: 1, additions: 10000, deletions: 10000 });
    const result = rankPRs([pr], makeCluster([1]));
    const s = result[0];
    for (const key of ['codeQuality', 'descriptionQuality', 'authorReputation', 'reviewStatus', 'testCoverage', 'recency', 'activity', 'overallScore'] as const) {
      expect(s[key]).toBeGreaterThanOrEqual(0);
      expect(s[key]).toBeLessThanOrEqual(1);
    }
  });
});
