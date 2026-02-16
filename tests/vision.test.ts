import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkVisionAlignment } from '../src/core/vision.js';
import type { GitHubIssue, GitHubPR } from '../src/core/types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeLLMResponse(items: { index: number; alignment: string; score: number; reasoning: string }[]) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(items) } }],
    }),
  };
}

const visionDoc = '# Vision\nBuild the best task management tool.';

const testItems: GitHubIssue[] = [
  {
    number: 1,
    title: 'Add task sorting',
    body: 'Sort tasks by priority',
    state: 'open',
    author: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    closedAt: null,
    labels: [],
    comments: 0,
    assignees: [],
    isPullRequest: false,
  },
  {
    number: 2,
    title: 'Fix typo in docs',
    body: 'Minor typo',
    state: 'open',
    author: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    closedAt: null,
    labels: [],
    comments: 0,
    assignees: [],
    isPullRequest: false,
  },
];

describe('checkVisionAlignment', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns alignment for each item', async () => {
    mockFetch.mockResolvedValueOnce(
      makeLLMResponse([
        { index: 1, alignment: 'aligned', score: 0.9, reasoning: 'Directly related' },
        { index: 2, alignment: 'tangential', score: 0.4, reasoning: 'Minor fix' },
      ]),
    );

    const results = await checkVisionAlignment(testItems, visionDoc, 'fake-key');
    expect(results).toHaveLength(2);
    expect(results[0].alignment).toBe('aligned');
    expect(results[0].score).toBe(0.9);
    expect(results[1].alignment).toBe('tangential');
  });

  it('handles LLM parse failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json{{{' } }],
      }),
    });

    const results = await checkVisionAlignment(testItems, visionDoc, 'fake-key');
    expect(results).toHaveLength(2);
    expect(results[0].alignment).toBe('tangential');
    expect(results[0].reasoning).toBe('Failed to analyze');
  });

  it('batches items in groups of 10', async () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      ...testItems[0],
      number: i + 1,
      title: `Item ${i + 1}`,
    }));

    mockFetch
      .mockResolvedValueOnce(
        makeLLMResponse(
          Array.from({ length: 10 }, (_, i) => ({
            index: i + 1,
            alignment: 'aligned',
            score: 0.8,
            reasoning: 'ok',
          })),
        ),
      )
      .mockResolvedValueOnce(
        makeLLMResponse(
          Array.from({ length: 5 }, (_, i) => ({
            index: i + 1,
            alignment: 'aligned',
            score: 0.8,
            reasoning: 'ok',
          })),
        ),
      );

    const results = await checkVisionAlignment(manyItems, visionDoc, 'fake-key');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(15);
  });
});
