import { readFileSync, writeFileSync, existsSync } from 'fs';
import type {
  PilotConfig,
  AnalysisResult,
  AnalysisState,
  GitHubItem,
  BatchOptions,
} from './types.js';
import { DEFAULT_CONFIG, createEmptyState } from './types.js';
import { fetchOpenPRs, fetchOpenIssues, fetchVisionDocument } from './github.js';
import { generateEmbeddings } from './embeddings.js';
import { findSimilarPairs, clusterDuplicates } from './similarity.js';
import { rankPRs } from './ranker.js';
import { checkVisionAlignment } from './vision.js';

const STATE_FILE = '.pr-pilot-state.json';

export function loadState(): AnalysisState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as AnalysisState;
  } catch {
    return null;
  }
}

export function saveState(state: AnalysisState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function getStateStatus(state: AnalysisState): string {
  const p = state.progress;
  const lines = [
    `Repository: ${state.repo}`,
    `Last run: ${state.lastRunAt}`,
    `PRs: ${p.fetchedPRs} fetched, Issues: ${p.fetchedIssues} fetched`,
    `Embedded: ${p.embeddedCount} of ${p.totalPRs + p.totalIssues} items`,
    `Vision checked: ${p.visionCheckedCount} of ${p.totalPRs + p.totalIssues} items`,
    `Completed: ${p.completed ? 'yes' : 'no'}`,
  ];
  return lines.join('\n');
}

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

export interface AnalyzeOptions {
  fresh?: boolean;
  batchSize?: number;
  onProgress?: (done: number, total: number, phase: string) => void;
}

export async function analyze(
  config: PilotConfig,
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config } as PilotConfig;
  const [owner, repo] = cfg.repo.split('/');
  const { fresh = false, batchSize = 50, onProgress } = options ?? {};

  // Load or create state
  let state: AnalysisState;
  const existingState = fresh ? null : loadState();
  if (existingState && existingState.repo === cfg.repo) {
    state = existingState;
  } else {
    state = createEmptyState(cfg.repo);
  }
  state.lastRunAt = new Date().toISOString();

  const batchOpts: Partial<BatchOptions> = {
    batchSize,
    onProgress,
  };

  // 1. Fetch PRs and Issues (if not already fetched)
  if (state.prs.length === 0) {
    onProgress?.(0, 0, 'fetching PRs');
    state.prs = await fetchOpenPRs(owner, repo, cfg.githubToken, cfg.maxItems);
    state.progress.fetchedPRs = state.prs.length;
    state.progress.totalPRs = state.prs.length;
    saveState(state);
  }

  if (state.issues.length === 0) {
    onProgress?.(0, 0, 'fetching issues');
    state.issues = await fetchOpenIssues(owner, repo, cfg.githubToken, cfg.maxItems);
    state.progress.fetchedIssues = state.issues.length;
    state.progress.totalIssues = state.issues.length;
    saveState(state);
  }

  // Update item list
  const allItemInputs = [
    ...state.prs.map((pr) => ({ number: pr.number, type: 'pr' as const, title: pr.title, body: pr.body })),
    ...state.issues.map((i) => ({ number: i.number, type: 'issue' as const, title: i.title, body: i.body })),
  ];
  state.items = allItemInputs.map((item) => {
    const existing = state.items.find((s) => s.number === item.number && s.type === item.type);
    return existing ?? {
      number: item.number,
      type: item.type,
      title: item.title,
      fetched: true,
      embedded: false,
      visionChecked: false,
    };
  });
  saveState(state);

  // 2. Generate embeddings (resumable — cache handles already-embedded items)
  const totalItems = allItemInputs.length;
  onProgress?.(state.progress.embeddedCount, totalItems, 'embeddings');

  const embedded = await generateEmbeddings(allItemInputs, cfg.openaiApiKey, cfg.embeddingModel, {
    ...batchOpts,
    onProgress: (done, total, phase) => {
      state.progress.embeddedCount = done;
      // Mark items as embedded
      for (const e of embedded ?? []) {
        const item = state.items.find((s) => s.number === e.number && s.type === e.type);
        if (item) item.embedded = true;
      }
      saveState(state);
      onProgress?.(done, total, phase);
    },
  });
  state.embeddedItems = embedded;
  state.progress.embeddedCount = embedded.length;
  for (const item of state.items) {
    item.embedded = true;
  }
  saveState(state);

  // 3. Find similar pairs and cluster
  const pairs = findSimilarPairs(embedded, cfg.duplicateThreshold);
  const clusters = clusterDuplicates(pairs, embedded);

  // 4. Rank PRs
  for (const cluster of clusters) {
    const rankings = rankPRs(state.prs, cluster);
    if (rankings.length > 0) {
      cluster.bestItem = rankings[0].number;
    }
  }
  const allRankings = clusters.flatMap((c) => rankPRs(state.prs, c));

  // 5. Vision alignment (skip items already checked if resuming)
  let visionAlignments = state.visionAlignments;
  const visionDoc = await fetchVisionDocument(owner, repo, cfg.githubToken, cfg.visionFile ?? undefined);
  if (visionDoc) {
    const checkedNumbers = new Set(visionAlignments.map((v) => v.number));
    const githubItems: GitHubItem[] = [...state.prs, ...state.issues];
    const unchecked = githubItems.filter((item) => !checkedNumbers.has(item.number));

    if (unchecked.length > 0) {
      onProgress?.(visionAlignments.length, githubItems.length, 'vision');
      const newAlignments = await checkVisionAlignment(unchecked, visionDoc, cfg.openaiApiKey, cfg.analysisModel, {
        ...batchOpts,
        batchSize: Math.min(batchSize, 10),
        onProgress: (done, total, phase) => {
          state.progress.visionCheckedCount = visionAlignments.length + done;
          saveState(state);
          onProgress?.(visionAlignments.length + done, githubItems.length, phase);
        },
      });
      visionAlignments = [...visionAlignments, ...newAlignments];
    }
  }
  state.visionAlignments = visionAlignments;
  state.progress.visionCheckedCount = visionAlignments.length;
  for (const va of visionAlignments) {
    const item = state.items.find((s) => s.number === va.number && s.type === va.type);
    if (item) item.visionChecked = true;
  }

  // 6. Build result
  const partialResult = {
    repo: cfg.repo,
    analyzedAt: new Date().toISOString(),
    totalPRs: state.prs.length,
    totalIssues: state.issues.length,
    duplicateClusters: clusters,
    prRankings: allRankings,
    visionAlignments,
  };

  // 7. Generate summary
  const summary = await generateSummary(partialResult, cfg.openaiApiKey, cfg.analysisModel);

  state.progress.completed = true;
  saveState(state);

  onProgress?.(totalItems, totalItems, 'complete');

  return { ...partialResult, summary };
}
