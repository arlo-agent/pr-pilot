import type { GitHubPR, DuplicateCluster, PRQualitySignals } from './types.js';

const WEIGHTS = {
  codeQuality: 0.2,
  descriptionQuality: 0.15,
  authorReputation: 0.15,
  reviewStatus: 0.2,
  testCoverage: 0.15,
  recency: 0.05,
  activity: 0.1,
};

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function scoreCodeQuality(pr: GitHubPR): number {
  const total = pr.additions + pr.deletions;
  if (total === 0) return 0.5;
  // Prefer balanced diffs; penalize huge changes
  const ratio = Math.min(pr.additions, pr.deletions) / Math.max(pr.additions, pr.deletions, 1);
  const sizeScore = 1 - clamp(total / 5000); // smaller is better
  return clamp((ratio * 0.5 + sizeScore * 0.5));
}

function scoreDescriptionQuality(pr: GitHubPR): number {
  const body = pr.body ?? '';
  let score = 0;
  // Length
  score += clamp(body.length / 500) * 0.4;
  // Linked issues
  if (/#\d+/.test(body)) score += 0.3;
  // Sections (markdown headers)
  if (/^#+\s/m.test(body)) score += 0.3;
  return clamp(score);
}

function scoreAuthorReputation(pr: GitHubPR): number {
  const map: Record<string, number> = {
    OWNER: 1.0,
    MEMBER: 0.8,
    COLLABORATOR: 0.7,
    CONTRIBUTOR: 0.5,
    FIRST_TIMER: 0.2,
    FIRST_TIME_CONTRIBUTOR: 0.2,
    NONE: 0.1,
  };
  return map[pr.authorAssociation] ?? 0.1;
}

function scoreReviewStatus(pr: GitHubPR): number {
  const map: Record<string, number> = {
    APPROVED: 1.0,
    REVIEW_REQUIRED: 0.5,
    CHANGES_REQUESTED: 0.2,
  };
  return map[pr.reviewDecision ?? ''] ?? 0.3;
}

function scoreTestCoverage(pr: GitHubPR): number {
  const testPatterns = [/test/i, /spec/i, /__tests__/i, /\.test\./, /\.spec\./];
  const hasTests = pr.filesChanged.some((f) => testPatterns.some((p) => p.test(f)));
  return hasTests ? 1.0 : 0.0;
}

function scoreRecency(pr: GitHubPR, prs: GitHubPR[]): number {
  if (prs.length <= 1) return 1;
  const dates = prs.map((p) => new Date(p.createdAt).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  if (max === min) return 1;
  const t = new Date(pr.createdAt).getTime();
  return (t - min) / (max - min);
}

function scoreActivity(pr: GitHubPR, prs: GitHubPR[]): number {
  const total = pr.comments + pr.reviewComments;
  const maxActivity = Math.max(...prs.map((p) => p.comments + p.reviewComments), 1);
  return clamp(total / maxActivity);
}

export function rankPRs(prs: GitHubPR[], cluster: DuplicateCluster): PRQualitySignals[] {
  // Filter PRs to those in the cluster
  const clusterNumbers = new Set(cluster.items.filter((i) => i.type === 'pr').map((i) => i.number));
  const clusterPRs = prs.filter((pr) => clusterNumbers.has(pr.number));

  if (clusterPRs.length === 0) return [];

  const signals: PRQualitySignals[] = clusterPRs.map((pr) => {
    const codeQuality = scoreCodeQuality(pr);
    const descriptionQuality = scoreDescriptionQuality(pr);
    const authorReputation = scoreAuthorReputation(pr);
    const reviewStatus = scoreReviewStatus(pr);
    const testCoverage = scoreTestCoverage(pr);
    const recency = scoreRecency(pr, clusterPRs);
    const activity = scoreActivity(pr, clusterPRs);

    const overallScore =
      codeQuality * WEIGHTS.codeQuality +
      descriptionQuality * WEIGHTS.descriptionQuality +
      authorReputation * WEIGHTS.authorReputation +
      reviewStatus * WEIGHTS.reviewStatus +
      testCoverage * WEIGHTS.testCoverage +
      recency * WEIGHTS.recency +
      activity * WEIGHTS.activity;

    return {
      number: pr.number,
      codeQuality,
      descriptionQuality,
      authorReputation,
      reviewStatus,
      testCoverage,
      recency,
      activity,
      overallScore,
    };
  });

  signals.sort((a, b) => b.overallScore - a.overallScore);
  return signals;
}
