import { describe, it, expect } from 'vitest';
import { createEmptyState } from '../src/types.js';

describe('createEmptyState', () => {
  it('creates state with correct repo', () => {
    const state = createEmptyState('owner/repo');
    expect(state.repo).toBe('owner/repo');
  });

  it('has empty arrays', () => {
    const state = createEmptyState('a/b');
    expect(state.items).toEqual([]);
    expect(state.prs).toEqual([]);
    expect(state.issues).toEqual([]);
    expect(state.embeddedItems).toEqual([]);
    expect(state.visionAlignments).toEqual([]);
  });

  it('has zero progress', () => {
    const state = createEmptyState('a/b');
    expect(state.progress).toEqual({
      totalPRs: 0,
      totalIssues: 0,
      fetchedPRs: 0,
      fetchedIssues: 0,
      embeddedCount: 0,
      visionCheckedCount: 0,
      completed: false,
    });
  });

  it('sets lastRunAt to a valid ISO date', () => {
    const state = createEmptyState('a/b');
    expect(() => new Date(state.lastRunAt)).not.toThrow();
    expect(new Date(state.lastRunAt).getTime()).not.toBeNaN();
  });
});
