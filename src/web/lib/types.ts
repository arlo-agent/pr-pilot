// Re-export types from core (duplicated here to keep web standalone)

export interface ClusterItem {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  similarity: number;
}

export interface DuplicateCluster {
  id: string;
  items: ClusterItem[];
  bestItem: number | null;
  averageSimilarity: number;
}

export interface PRQualitySignals {
  number: number;
  codeQuality: number;
  descriptionQuality: number;
  authorReputation: number;
  reviewStatus: number;
  testCoverage: number;
  recency: number;
  activity: number;
  overallScore: number;
}

export interface VisionAlignment {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  alignment: 'aligned' | 'tangential' | 'misaligned';
  score: number;
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
