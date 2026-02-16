'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { PRQualitySignals } from '@/lib/types';
import { ScoreBadge } from '@/components/ScoreBadge';

type SortKey = keyof Pick<PRQualitySignals, 'overallScore' | 'codeQuality' | 'descriptionQuality' | 'authorReputation' | 'reviewStatus' | 'testCoverage' | 'recency' | 'activity'>;

const columns: { key: SortKey; label: string }[] = [
  { key: 'overallScore', label: 'Overall' },
  { key: 'codeQuality', label: 'Code' },
  { key: 'descriptionQuality', label: 'Desc' },
  { key: 'authorReputation', label: 'Author' },
  { key: 'reviewStatus', label: 'Review' },
  { key: 'testCoverage', label: 'Tests' },
  { key: 'recency', label: 'Recency' },
  { key: 'activity', label: 'Activity' },
];

export default function RankingsPage() {
  const { data } = useAnalysis();
  const [sortBy, setSortBy] = useState<SortKey>('overallScore');
  const [asc, setAsc] = useState(false);

  if (!data) return null;

  if (data.prRankings.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">PR Rankings</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No PR rankings available yet.</p>
        </div>
      </div>
    );
  }

  const sorted = [...data.prRankings].sort((a, b) => asc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setAsc(!asc);
    else { setSortBy(key); setAsc(false); }
  };

  const ghUrl = (num: number) => `https://github.com/${data.repo}/pull/${num}`;

  // Build title map from vision alignments
  const titleMap = new Map(data.visionAlignments.map(v => [v.number, v.title]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">PR Rankings ({sorted.length})</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-2 text-gray-400">#</th>
              <th className="text-left p-2 text-gray-400">Title</th>
              {columns.map(c => (
                <th
                  key={c.key}
                  className="p-2 text-gray-400 cursor-pointer hover:text-white text-center whitespace-nowrap"
                  onClick={() => handleSort(c.key)}
                >
                  {c.label} {sortBy === c.key ? (asc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(pr => (
              <tr key={pr.number} className="border-b border-gray-800/50 hover:bg-gray-900">
                <td className="p-2">
                  <a href={ghUrl(pr.number)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">
                    #{pr.number}
                  </a>
                </td>
                <td className="p-2 max-w-xs truncate text-gray-300">
                  {titleMap.get(pr.number) || `PR #${pr.number}`}
                </td>
                {columns.map(c => (
                  <td key={c.key} className="p-2 text-center">
                    <ScoreBadge score={pr[c.key]} />
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
