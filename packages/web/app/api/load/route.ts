import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * Transform raw AnalysisState into AnalysisResult shape for the frontend.
 * If the data already has totalPRs at root (AnalysisResult), pass through.
 */
function normalizeData(raw: Record<string, unknown>): Record<string, unknown> {
  // Already an AnalysisResult (e.g. from --json output)
  if (typeof raw.totalPRs === 'number' && Array.isArray(raw.prRankings)) {
    return raw;
  }

  // It's an AnalysisState — transform it
  const progress = (raw.progress as Record<string, unknown>) || {};
  const prs = (raw.prs as Array<unknown>) || [];
  const issues = (raw.issues as Array<unknown>) || [];
  const visionAlignments = (raw.visionAlignments as Array<unknown>) || [];

  return {
    repo: raw.repo || '',
    analyzedAt: raw.lastRunAt || new Date().toISOString(),
    totalPRs: progress.totalPRs ?? prs.length,
    totalIssues: progress.totalIssues ?? issues.length,
    duplicateClusters: raw.duplicateClusters || [],
    prRankings: raw.prRankings || [],
    visionAlignments,
    summary: raw.summary || '',
  };
}

export async function GET() {
  const dataPath = process.env.PR_PILOT_DATA_PATH || resolve(process.cwd(), '../../.pr-pilot-state.json');
  try {
    const raw = await readFile(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(normalizeData(data));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load data from ${dataPath}: ${message}` }, { status: 500 });
  }
}
