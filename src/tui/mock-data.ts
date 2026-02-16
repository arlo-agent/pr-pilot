import type { AnalysisResult } from '../core/types.js';

export const mockData: AnalysisResult = {
  repo: 'acme/widgets',
  analyzedAt: new Date().toISOString(),
  totalPRs: 24,
  totalIssues: 37,
  duplicateClusters: [
    {
      id: 'cluster-1',
      items: [
        { number: 42, type: 'pr', title: 'Fix authentication timeout handling', similarity: 0.95 },
        { number: 38, type: 'pr', title: 'Handle auth token expiration gracefully', similarity: 0.92 },
        { number: 101, type: 'issue', title: 'Auth tokens expire without retry', similarity: 0.88 },
      ],
      bestItem: 42,
      averageSimilarity: 0.92,
    },
    {
      id: 'cluster-2',
      items: [
        { number: 55, type: 'pr', title: 'Add dark mode support to settings page', similarity: 0.97 },
        { number: 60, type: 'issue', title: 'Dark mode not working in settings', similarity: 0.91 },
        { number: 63, type: 'pr', title: 'Settings page dark theme implementation', similarity: 0.89 },
        { number: 58, type: 'issue', title: 'Request: dark mode for settings', similarity: 0.85 },
      ],
      bestItem: 55,
      averageSimilarity: 0.90,
    },
    {
      id: 'cluster-3',
      items: [
        { number: 77, type: 'pr', title: 'Optimize database query for user search', similarity: 0.88 },
        { number: 120, type: 'issue', title: 'User search is extremely slow', similarity: 0.84 },
      ],
      bestItem: 77,
      averageSimilarity: 0.86,
    },
    {
      id: 'cluster-4',
      items: [
        { number: 90, type: 'issue', title: 'Add CSV export for reports', similarity: 0.93 },
        { number: 91, type: 'pr', title: 'Implement CSV export functionality', similarity: 0.91 },
        { number: 95, type: 'issue', title: 'Export reports to CSV format', similarity: 0.87 },
      ],
      bestItem: 91,
      averageSimilarity: 0.90,
    },
  ],
  prRankings: [
    { number: 42, codeQuality: 0.9, descriptionQuality: 0.85, authorReputation: 0.8, reviewStatus: 0.95, testCoverage: 0.7, recency: 0.9, activity: 0.8, overallScore: 0.86 },
    { number: 55, codeQuality: 0.85, descriptionQuality: 0.9, authorReputation: 0.75, reviewStatus: 0.8, testCoverage: 0.6, recency: 0.85, activity: 0.7, overallScore: 0.78 },
    { number: 77, codeQuality: 0.7, descriptionQuality: 0.6, authorReputation: 0.9, reviewStatus: 0.5, testCoverage: 0.8, recency: 0.7, activity: 0.5, overallScore: 0.67 },
    { number: 38, codeQuality: 0.6, descriptionQuality: 0.5, authorReputation: 0.4, reviewStatus: 0.3, testCoverage: 0.2, recency: 0.6, activity: 0.4, overallScore: 0.43 },
    { number: 63, codeQuality: 0.4, descriptionQuality: 0.3, authorReputation: 0.5, reviewStatus: 0.2, testCoverage: 0.1, recency: 0.5, activity: 0.3, overallScore: 0.33 },
    { number: 91, codeQuality: 0.75, descriptionQuality: 0.8, authorReputation: 0.7, reviewStatus: 0.85, testCoverage: 0.65, recency: 0.95, activity: 0.6, overallScore: 0.76 },
  ],
  visionAlignments: [
    { number: 42, type: 'pr', title: 'Fix authentication timeout handling', alignment: 'aligned', score: 0.92, reasoning: 'Directly addresses reliability goal in vision doc — auth stability is a core pillar.', relevantVisionSection: 'Reliability & Uptime' },
    { number: 55, type: 'pr', title: 'Add dark mode support to settings page', alignment: 'tangential', score: 0.55, reasoning: 'UX improvement but not in current quarter priorities. Nice-to-have.', relevantVisionSection: 'User Experience' },
    { number: 77, type: 'pr', title: 'Optimize database query for user search', alignment: 'aligned', score: 0.88, reasoning: 'Performance optimization aligns with scaling goals.', relevantVisionSection: 'Performance & Scale' },
    { number: 101, type: 'issue', title: 'Auth tokens expire without retry', alignment: 'aligned', score: 0.90, reasoning: 'Core reliability concern matching vision priorities.', relevantVisionSection: 'Reliability & Uptime' },
    { number: 60, type: 'issue', title: 'Dark mode not working in settings', alignment: 'tangential', score: 0.45, reasoning: 'Low priority UX polish, not in current roadmap.', relevantVisionSection: null },
    { number: 120, type: 'issue', title: 'User search is extremely slow', alignment: 'aligned', score: 0.85, reasoning: 'Performance directly impacts user retention — key metric.', relevantVisionSection: 'Performance & Scale' },
    { number: 90, type: 'issue', title: 'Add CSV export for reports', alignment: 'misaligned', score: 0.2, reasoning: 'Feature not on roadmap. Distracts from core priorities.', relevantVisionSection: null },
    { number: 63, type: 'pr', title: 'Settings page dark theme implementation', alignment: 'misaligned', score: 0.15, reasoning: 'Duplicate effort on a non-priority feature. Should be closed.', relevantVisionSection: null },
    { number: 38, type: 'pr', title: 'Handle auth token expiration gracefully', alignment: 'aligned', score: 0.80, reasoning: 'Auth reliability improvement, but duplicates #42.', relevantVisionSection: 'Reliability & Uptime' },
  ],
  summary: 'Found 4 duplicate clusters across 24 PRs and 37 issues. 2 PRs are misaligned with project vision. Top recommendation: merge PR #42 (auth fix) and close duplicates #38, #101.',
};
