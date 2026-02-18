import type { AnalysisResult } from './types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    if (response.status === 429) {
      if (attempt >= maxRetries) {
        throw new Error(`OpenAI rate limit (429) after ${maxRetries + 1} attempts`);
      }
      const waitMs = Math.min(1000 * Math.pow(2, attempt + 1), 30000);
      await sleep(waitMs);
      continue;
    }
    return response;
  }
  throw new Error('fetchWithRetry exhausted');
}

/**
 * Generate a concise prose summary of the analysis results using an LLM.
 */
export async function generateSummary(
  result: AnalysisResult,
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<string> {
  // Build a compact data payload for the LLM
  const topPRs = [...result.prRankings]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10)
    .map((pr) => `#${pr.number} (score: ${pr.overallScore.toFixed(2)})`);

  const clusters = result.duplicateClusters
    .filter((c) => c.items.length >= 2)
    .slice(0, 10)
    .map(
      (c) =>
        `[${c.items.map((i) => `#${i.number} ${i.title}`).join(', ')}] (avg similarity: ${c.averageSimilarity.toFixed(2)})`,
    );

  const misaligned = result.visionAlignments
    .filter((v) => v.alignment === 'misaligned')
    .slice(0, 10)
    .map((v) => `#${v.number} "${v.title}" — ${v.reasoning}`);

  const tangential = result.visionAlignments
    .filter((v) => v.alignment === 'tangential')
    .slice(0, 5)
    .map((v) => `#${v.number} "${v.title}"`);

  const prompt = `You are a senior engineering lead reviewing a GitHub repository triage report. Write a concise summary (max ~30 lines) that a maintainer can scan in one terminal screen.

Repository: ${result.repo}
Analyzed: ${result.analyzedAt}
Open PRs: ${result.totalPRs}, Open Issues: ${result.totalIssues}

TOP PRIORITY PRs (by quality/urgency score):
${topPRs.length > 0 ? topPRs.join('\n') : 'None ranked yet.'}

DUPLICATE/RELATED CLUSTERS (candidates for closing or merging):
${clusters.length > 0 ? clusters.join('\n') : 'No duplicates found.'}

MISALIGNED WITH VISION:
${misaligned.length > 0 ? misaligned.join('\n') : 'None misaligned.'}

TANGENTIAL:
${tangential.length > 0 ? tangential.join('\n') : 'None.'}

Write a brief executive summary covering:
1. Top 3-5 PRs to review first and why
2. Duplicate clusters worth closing/merging (be specific about which to close)
3. Items misaligned with the project vision that need attention
4. 2-4 actionable recommendations

Be direct and specific. No filler. Use plain text with simple formatting (dashes for bullets). Start with a one-line overall assessment.`;

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1000,
      }),
    },
    3,
  );

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? 'Unable to generate summary.';
}
