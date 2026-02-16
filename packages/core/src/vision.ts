import type { GitHubItem, VisionAlignment } from './types.js';

function isIssue(item: GitHubItem): item is import('./types.js').GitHubIssue {
  return 'isPullRequest' in item;
}

function getType(item: GitHubItem): 'pr' | 'issue' {
  return isIssue(item) ? 'issue' : 'pr';
}

export async function checkVisionAlignment(
  items: GitHubItem[],
  visionDoc: string,
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<VisionAlignment[]> {
  const results: VisionAlignment[] = [];
  const batchSize = 10;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const itemDescriptions = batch
      .map(
        (item, idx) =>
          `${idx + 1}. [${getType(item) === 'pr' ? 'PR' : 'Issue'}] #${item.number}: ${item.title}\n${(item.body ?? '').slice(0, 500)}`,
      )
      .join('\n\n');

    const prompt = `Given this project vision document:

---
${visionDoc.slice(0, 3000)}
---

Classify each of the following PRs/Issues as "aligned", "tangential", or "misaligned" with a score from 0-1 and brief reasoning.

Items:
${itemDescriptions}

Respond in JSON format as an array:
[{"index": 1, "alignment": "aligned"|"tangential"|"misaligned", "score": 0.0-1.0, "reasoning": "...", "relevantSection": "..." or null}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    try {
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.results ?? [];

      for (const entry of arr) {
        const idx = (entry.index ?? 1) - 1;
        const item = batch[idx];
        if (!item) continue;

        results.push({
          number: item.number,
          type: getType(item),
          title: item.title,
          alignment: entry.alignment ?? 'tangential',
          score: entry.score ?? 0.5,
          reasoning: entry.reasoning ?? '',
          relevantVisionSection: entry.relevantSection ?? null,
        });
      }
    } catch {
      // If parsing fails, mark all as tangential
      for (const item of batch) {
        results.push({
          number: item.number,
          type: getType(item),
          title: item.title,
          alignment: 'tangential',
          score: 0.5,
          reasoning: 'Failed to analyze',
          relevantVisionSection: null,
        });
      }
    }
  }

  return results;
}
