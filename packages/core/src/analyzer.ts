import type { PilotConfig, AnalysisResult, GitHubItem } from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { fetchOpenPRs, fetchOpenIssues, fetchVisionDocument } from './github.js';
import { generateEmbeddings } from './embeddings.js';
import { findSimilarPairs, clusterDuplicates } from './similarity.js';
import { rankPRs } from './ranker.js';
import { checkVisionAlignment } from './vision.js';

async function generateSummary(
  result: Omit<AnalysisResult, 'summary'>,
  apiKey: string,
  model: string,
): Promise<string> {
  const prompt = `Summarize this GitHub repo analysis:
- ${result.totalPRs} open PRs, ${result.totalIssues} open issues
- ${result.duplicateClusters.length} duplicate clusters found
- ${result.visionAlignments.filter((v) => v.alignment === 'aligned').length} items aligned with vision
- ${result.visionAlignments.filter((v) => v.alignment === 'misaligned').length} items misaligned

Top ranked PRs: ${result.prRankings.slice(0, 3).map((r) => `#${r.number} (score: ${r.overallScore.toFixed(2)})`).join(', ')}

Provide a concise 2-3 sentence summary with actionable recommendations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    }),
  });

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? 'Analysis complete.';
}

export async function analyze(config: PilotConfig): Promise<AnalysisResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config } as PilotConfig;
  const [owner, repo] = cfg.repo.split('/');

  // 1. Fetch PRs and Issues
  const prs = await fetchOpenPRs(owner, repo, cfg.githubToken, cfg.maxItems);
  const issues = await fetchOpenIssues(owner, repo, cfg.githubToken, cfg.maxItems);

  // 2. Generate embeddings
  const allItems = [
    ...prs.map((pr) => ({ number: pr.number, type: 'pr' as const, title: pr.title, body: pr.body })),
    ...issues.map((i) => ({ number: i.number, type: 'issue' as const, title: i.title, body: i.body })),
  ];
  const embedded = await generateEmbeddings(allItems, cfg.openaiApiKey, cfg.embeddingModel);

  // 3. Find similar pairs and cluster
  const pairs = findSimilarPairs(embedded, cfg.duplicateThreshold);
  const clusters = clusterDuplicates(pairs, embedded);

  // 4. Rank PRs within each cluster
  for (const cluster of clusters) {
    const rankings = rankPRs(prs, cluster);
    if (rankings.length > 0) {
      cluster.bestItem = rankings[0].number;
    }
  }
  const allRankings = clusters.flatMap((c) => rankPRs(prs, c));

  // 5. Vision alignment
  let visionAlignments: AnalysisResult['visionAlignments'] = [];
  const visionDoc = await fetchVisionDocument(owner, repo, cfg.githubToken, cfg.visionFile ?? undefined);
  if (visionDoc) {
    const githubItems: GitHubItem[] = [...prs, ...issues];
    visionAlignments = await checkVisionAlignment(githubItems, visionDoc, cfg.openaiApiKey, cfg.analysisModel);
  }

  // 6. Build result
  const partialResult = {
    repo: cfg.repo,
    analyzedAt: new Date().toISOString(),
    totalPRs: prs.length,
    totalIssues: issues.length,
    duplicateClusters: clusters,
    prRankings: allRankings,
    visionAlignments,
  };

  // 7. Generate summary
  const summary = await generateSummary(partialResult, cfg.openaiApiKey, cfg.analysisModel);

  return { ...partialResult, summary };
}
