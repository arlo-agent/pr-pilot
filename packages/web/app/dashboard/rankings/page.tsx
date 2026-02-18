'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { PRQualitySignals } from '@/lib/types';

type SortKey = 'overallScore' | 'codeQuality' | 'descriptionQuality' | 'authorReputation' | 'reviewStatus' | 'testCoverage' | 'recency' | 'activity';

const columns: { key: SortKey; label: string }[] = [
  { key: 'overallScore', label: 'Score' },
  { key: 'codeQuality', label: 'Code' },
  { key: 'descriptionQuality', label: 'Desc' },
  { key: 'authorReputation', label: 'Author' },
  { key: 'reviewStatus', label: 'Reviews' },
  { key: 'testCoverage', label: 'Tests' },
  { key: 'recency', label: 'Recency' },
  { key: 'activity', label: 'Activity' },
];

const scoreColor = (s: number) => s >= 0.7 ? '#22c55e' : s >= 0.3 ? '#eab308' : '#ef4444';

export default function RankingsPage() {
  const { data } = useAnalysis();
  const [sortBy, setSortBy] = useState<SortKey>('overallScore');
  const [asc, setAsc] = useState(false);

  if (!data) return null;
  const prRankings = data.prRankings ?? [];
  const va = data.visionAlignments ?? [];
  const titleMap = new Map(va.map(v => [v.number, v.title]));

  if (prRankings.length === 0) {
    return (
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>PR Rankings</h1>
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: 32, textAlign: 'center', color: '#a1a1aa' }}>No PR rankings available.</div>
      </div>
    );
  }

  const sorted = [...prRankings].sort((a, b) => asc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]);
  const handleSort = (key: SortKey) => {
    if (sortBy === key) setAsc(!asc);
    else { setSortBy(key); setAsc(false); }
  };

  const thStyle = { padding: '10px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#a1a1aa', cursor: 'pointer', textAlign: 'center' as const, borderBottom: '1px solid #27272a' };

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>PR Rankings</h1>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>{sorted.length} PRs</span>
      </div>
      <div style={{ background: '#18181b', border: '1px solid #27272a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: 60 }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Title</th>
              {columns.map(c => (
                <th key={c.key} style={thStyle} onClick={() => handleSort(c.key)}>
                  {c.label} {sortBy === c.key ? (asc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((pr, i) => (
              <tr key={pr.number} style={{ background: i % 2 === 0 ? 'transparent' : '#1c1c1f' }}>
                <td style={{ padding: '8px', borderBottom: '1px solid #1e1e21' }}>
                  <a href={`https://github.com/${data.repo}/pull/${pr.number}`} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: 12 }}>#{pr.number}</a>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #1e1e21', color: '#a1a1aa', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {titleMap.get(pr.number) || `PR #${pr.number}`}
                </td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '8px', borderBottom: '1px solid #1e1e21', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: scoreColor(pr[c.key]), background: '#27272a', padding: '2px 6px', display: 'inline-block' }}>
                      {(pr[c.key] * 100).toFixed(0)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
