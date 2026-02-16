/**
 * Core types for PR Pilot
 */

// ============================================================================
// GitHub Data Types
// ============================================================================

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  authorAssociation: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  labels: string[];
  reviewDecision: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  comments: number;
  reviewComments: number;
  commits: number;
  filesChanged: string[];
  draft: boolean;
  mergeable: boolean | null;
  headRef: string;
  baseRef: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: string[];
  comments: number;
  assignees: string[];
  isPullRequest: boolean;
}

export type GitHubItem = GitHubPR | GitHubIssue;

// ============================================================================
// Embedding & Similarity
// ============================================================================

export interface EmbeddedItem {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  embedding: number[];
  textHash: string;
}

export interface SimilarityResult {
  itemA: number;
  itemB: number;
  score: number;
  typeA: 'pr' | 'issue';
  typeB: 'pr' | 'issue';
}

export interface DuplicateCluster {
  id: string;
  items: ClusterItem[];
  bestItem: number | null;
  averageSimilarity: number;
}

export interface ClusterItem {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  similarity: number; // similarity to cluster centroid
}

// ============================================================================
// Analysis & Ranking
// ============================================================================

export interface PRQualitySignals {
  number: number;
  codeQuality: number;       // 0-1: clean diff, no lint issues
  descriptionQuality: number; // 0-1: clear description, linked issues
  authorReputation: number;   // 0-1: contributor history
  reviewStatus: number;       // 0-1: approvals, review comments
  testCoverage: number;       // 0-1: includes tests
  recency: number;            // 0-1: how recent
  activity: number;           // 0-1: discussion, updates
  overallScore: number;       // weighted average
}

export interface VisionAlignment {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  alignment: 'aligned' | 'tangential' | 'misaligned';
  score: number;              // 0-1
  reasoning: string;
  relevantVisionSection: string | null;
}

export interface AnalysisResult {
  repo: string;
  analyzedAt: string;
  totalPRs: number;
  totalIssues: number;
  duplicateClusters: DuplicateCluster[];
  prRankings: PRQualitySignals[];
  visionAlignments: VisionAlignment[];
  summary: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface PilotConfig {
  githubToken: string;
  openaiApiKey: string;
  repo: string;               // "owner/repo"
  duplicateThreshold: number;  // cosine similarity threshold (default 0.85)
  relatedThreshold: number;    // related items threshold (default 0.70)
  embeddingModel: string;      // default: text-embedding-3-small
  analysisModel: string;       // default: gpt-4o-mini
  visionFile: string | null;   // path to vision document in repo
  maxItems: number;            // max PRs/Issues to process
  includeClosedDays: number;   // include items closed within N days (0 = open only)
}

// ============================================================================
// Persistent State (for resumable analysis)
// ============================================================================

export interface ItemState {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  fetched: boolean;
  embedded: boolean;
  visionChecked: boolean;
}

export interface AnalysisState {
  repo: string;
  lastRunAt: string;
  items: ItemState[];
  prs: GitHubPR[];
  issues: GitHubIssue[];
  embeddedItems: EmbeddedItem[];
  visionAlignments: VisionAlignment[];
  progress: {
    totalPRs: number;
    totalIssues: number;
    fetchedPRs: number;
    fetchedIssues: number;
    embeddedCount: number;
    visionCheckedCount: number;
    wavesCompleted: number;
    completed: boolean;
  };
}

export function createEmptyState(repo: string): AnalysisState {
  return {
    repo,
    lastRunAt: new Date().toISOString(),
    items: [],
    prs: [],
    issues: [],
    embeddedItems: [],
    visionAlignments: [],
    progress: {
      totalPRs: 0,
      totalIssues: 0,
      fetchedPRs: 0,
      fetchedIssues: 0,
      embeddedCount: 0,
      visionCheckedCount: 0,
      wavesCompleted: 0,
      completed: false,
    },
  };
}

// ============================================================================
// Batch Processing Options
// ============================================================================

export interface BatchOptions {
  batchSize: number;
  delayMs: number;
  maxRetries: number;
  onProgress?: (done: number, total: number, phase: string) => void;
}

export const DEFAULT_BATCH_OPTIONS: BatchOptions = {
  batchSize: 50,
  delayMs: 1500,
  maxRetries: 3,
};

export const DEFAULT_CONFIG: Partial<PilotConfig> = {
  duplicateThreshold: 0.85,
  relatedThreshold: 0.70,
  embeddingModel: 'text-embedding-3-small',
  analysisModel: 'gpt-4o-mini',
  visionFile: null,
  maxItems: 500,
  includeClosedDays: 0,
};
