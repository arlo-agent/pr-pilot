import { readFileSync, writeFileSync, existsSync } from 'fs';
import type {
  PilotConfig,
  AnalysisResult,
  AnalysisState,
  GitHubItem,
  BatchOptions,
  DuplicateCluster,
  PRQualitySignals,
  VisionAlignment,
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
  const total = p.totalPRs + p.totalIssues;
  const lines = [
    `Repository: ${state.repo}`,
    `Last run: ${state.lastRunAt}`,
    `PRs: ${p.fetchedPRs} fetched, Issues: ${p.fetchedIssues} fetched`,
    `Embedded: ${p.embeddedCount} of ${total} items`,
    `Vision checked: ${p.visionCheckedCount} of ${total} items`,
    `Waves completed: ${p.wavesCompleted ?? 0}`,
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
  pauseBetweenPhases?: boolean;
  onPause?: (phase: string, done: number, total: number) => Promise<void>;
  onProgress?: (done: number, total: number, phase: string) => void;
  /** Called after each wave with intermediate results — viewer can display them */
  onWaveComplete?: (result: AnalysisResult, wave: number, totalWaves: number) => Promise<void>;
}

/**
 * Build an AnalysisResult from the current state (works with partial data).
 */
function buildResult(
  state: AnalysisState,
  clusters: DuplicateCluster[],
  rankings: PRQualitySignals[],
  visionAlignments: VisionAlignment[],
  summary: string,
): AnalysisResult {
  return {
    repo: state.repo,
    analyzedAt: new Date().toISOString(),
    totalPRs: state.prs.length,
    totalIssues: state.issues.length,
    duplicateClusters: clusters,
    prRankings: rankings,
    visionAlignments,
    summary,
  };
}

export async function analyze(
  config: PilotConfig,
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config } as PilotConfig;
  const [owner, repo] = cfg.repo.split('/');
  const {
    fresh = false,
    batchSize = 50,
    pauseBetweenPhases = false,
    onPause,
    onProgress,
    onWaveComplete,
  } = options ?? {};

  // Load or create state
  let state: AnalysisState;
  const existingState = fresh ? null : loadState();
  if (existingState && existingState.repo === cfg.repo) {
    state = existingState;
  } else {
    state = createEmptyState(cfg.repo);
  }
  state.lastRunAt = new Date().toISOString();

  // 1. Fetch all PRs and Issues (we need the full list to know what to process)
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

  onProgress?.(state.prs.length + state.issues.length, state.prs.length + state.issues.length, 'fetched');

  // Build full item list
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

  // Fetch vision doc once (needed for each wave)
  const visionDoc = await fetchVisionDocument(owner, repo, cfg.githubToken, cfg.visionFile ?? undefined);

  // Determine what's already processed
  const processedNumbers = new Set(
    state.items.filter((i) => i.embedded && i.visionChecked).map((i) => `${i.type}-${i.number}`)
  );

  // Split remaining items into waves
  const unprocessed = allItemInputs.filter((item) => !processedNumbers.has(`${item.type}-${item.number}`));
  const totalWaves = Math.ceil(unprocessed.length / batchSize);
  const wavesAlreadyDone = state.progress.wavesCompleted ?? 0;

  // Accumulated results across all waves
  let allEmbedded = state.embeddedItems ?? [];
  let allVisionAlignments = state.visionAlignments ?? [];
  let allClusters: DuplicateCluster[] = [];
  let allRankings: PRQualitySignals[] = [];

  // If resuming and we have existing embeddings, rebuild clusters/rankings from them
  if (allEmbedded.length > 0) {
    const pairs = findSimilarPairs(allEmbedded, cfg.duplicateThreshold);
    allClusters = clusterDuplicates(pairs, allEmbedded);
    for (const cluster of allClusters) {
      const rankings = rankPRs(state.prs, cluster);
      if (rankings.length > 0) cluster.bestItem = rankings[0].number;
    }
    allRankings = allClusters.flatMap((c) => rankPRs(state.prs, c));
  }

  if (unprocessed.length === 0 && allEmbedded.length > 0) {
    // Everything already processed — just rebuild and return
    onProgress?.(allItemInputs.length, allItemInputs.length, 'complete');
    const summary = await generateSummary(
      buildResult(state, allClusters, allRankings, allVisionAlignments, ''),
      cfg.openaiApiKey, cfg.analysisModel,
    );
    state.progress.completed = true;
    saveState(state);
    return buildResult(state, allClusters, allRankings, allVisionAlignments, summary);
  }

  // Process in waves
  for (let w = 0; w < totalWaves; w++) {
    const waveNum = wavesAlreadyDone + w + 1;
    const waveStart = w * batchSize;
    const waveItems = unprocessed.slice(waveStart, waveStart + batchSize);
    const totalProcessed = (wavesAlreadyDone + w) * batchSize + allEmbedded.length;

    onProgress?.(totalProcessed, allItemInputs.length, `wave ${waveNum} — embedding`);

    // a) Embed this wave
    const waveEmbedded = await generateEmbeddings(waveItems, cfg.openaiApiKey, cfg.embeddingModel, {
      batchSize,  // send the whole wave as one embedding batch
      delayMs: 1500,
      maxRetries: 5,
      onProgress: (done, total, phase) => {
        onProgress?.(allEmbedded.length + done, allItemInputs.length, `wave ${waveNum} — ${phase}`);
      },
    });

    // Merge into accumulated embeddings
    allEmbedded = [...allEmbedded, ...waveEmbedded.filter((e) => e.embedding.length > 0)];

    // Mark embedded in state
    for (const e of waveEmbedded) {
      const item = state.items.find((s) => s.number === e.number && s.type === e.type);
      if (item) item.embedded = true;
    }
    state.embeddedItems = allEmbedded;
    state.progress.embeddedCount = allEmbedded.length;
    saveState(state);

    // b) Similarity + clustering on everything we have so far
    onProgress?.(allEmbedded.length, allItemInputs.length, `wave ${waveNum} — clustering`);
    const pairs = findSimilarPairs(allEmbedded, cfg.duplicateThreshold);
    allClusters = clusterDuplicates(pairs, allEmbedded);

    // c) Rank PRs in clusters
    for (const cluster of allClusters) {
      const rankings = rankPRs(state.prs, cluster);
      if (rankings.length > 0) cluster.bestItem = rankings[0].number;
    }
    allRankings = allClusters.flatMap((c) => rankPRs(state.prs, c));

    // d) Vision alignment for this wave's items
    if (visionDoc) {
      onProgress?.(allVisionAlignments.length, allItemInputs.length, `wave ${waveNum} — vision`);
      const githubItems: GitHubItem[] = [
        ...state.prs.filter((pr) => waveItems.some((wi) => wi.number === pr.number && wi.type === 'pr')),
        ...state.issues.filter((iss) => waveItems.some((wi) => wi.number === iss.number && wi.type === 'issue')),
      ];

      if (githubItems.length > 0) {
        const newAlignments = await checkVisionAlignment(
          githubItems, visionDoc, cfg.openaiApiKey, cfg.analysisModel,
          {
            batchSize: Math.min(batchSize, 10),
            delayMs: 1500,
            maxRetries: 5,
            onProgress: (done, total, phase) => {
              onProgress?.(allVisionAlignments.length + done, allItemInputs.length, `wave ${waveNum} — ${phase}`);
            },
          },
        );
        allVisionAlignments = [...allVisionAlignments, ...newAlignments];
      }
    }

    // Update state
    state.visionAlignments = allVisionAlignments;
    state.progress.visionCheckedCount = allVisionAlignments.length;
    state.progress.wavesCompleted = wavesAlreadyDone + w + 1;
    for (const va of allVisionAlignments) {
      const item = state.items.find((s) => s.number === va.number && s.type === va.type);
      if (item) item.visionChecked = true;
    }
    saveState(state);

    // Build intermediate result
    const intermediateResult = buildResult(state, allClusters, allRankings, allVisionAlignments,
      `Partial analysis: ${allEmbedded.length} of ${allItemInputs.length} items processed (wave ${waveNum}/${wavesAlreadyDone + totalWaves}).`);

    // Notify wave complete
    if (onWaveComplete) {
      await onWaveComplete(intermediateResult, waveNum, wavesAlreadyDone + totalWaves);
    }

    // Pause between waves
    if (pauseBetweenPhases && onPause && w < totalWaves - 1) {
      await onPause(`wave ${waveNum} complete`, allEmbedded.length, allItemInputs.length);
    }
  }

  // Final summary
  onProgress?.(allItemInputs.length, allItemInputs.length, 'generating summary');
  const summary = await generateSummary(
    buildResult(state, allClusters, allRankings, allVisionAlignments, ''),
    cfg.openaiApiKey, cfg.analysisModel,
  );

  state.progress.completed = true;
  saveState(state);

  onProgress?.(allItemInputs.length, allItemInputs.length, 'complete');

  return buildResult(state, allClusters, allRankings, allVisionAlignments, summary);
}
