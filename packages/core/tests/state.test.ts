import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadState, saveState, getStateStatus } from '../src/analyzer.js';
import type { AnalysisState } from '../src/types.js';
import { createEmptyState } from '../src/types.js';
import * as fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('loadState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(loadState()).toBeNull();
  });

  it('returns parsed state when file exists', () => {
    const state = createEmptyState('owner/repo');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(state));
    const result = loadState();
    expect(result?.repo).toBe('owner/repo');
  });

  it('returns null for corrupt JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('not json{{{');
    expect(loadState()).toBeNull();
  });
});

describe('saveState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes state to file', () => {
    const state = createEmptyState('a/b');
    saveState(state);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '.pr-pilot-state.json',
      expect.stringContaining('"repo": "a/b"'),
    );
  });
});

describe('getStateStatus', () => {
  it('returns formatted status string', () => {
    const state: AnalysisState = {
      ...createEmptyState('owner/repo'),
      progress: {
        totalPRs: 10,
        totalIssues: 5,
        fetchedPRs: 10,
        fetchedIssues: 5,
        embeddedCount: 8,
        visionCheckedCount: 3,
        completed: false,
      },
    };
    const status = getStateStatus(state);
    expect(status).toContain('owner/repo');
    expect(status).toContain('Embedded: 8 of 15');
    expect(status).toContain('Vision checked: 3 of 15');
    expect(status).toContain('Completed: no');
  });
});
