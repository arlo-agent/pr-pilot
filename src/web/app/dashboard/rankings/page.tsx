'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { PRQualitySignals } from '@/lib/types';
import { ScoreBadge } from '@/components/ScoreBadge';

type SortKey = keyof Pick<PRQualitySignals, 'overallScore' | 'codeQuality' | 'descriptionQuality' | 'authorReputation' | 'reviewStatus' | 'testCoverage'>;

const columns: { key: SortKey; label: string }[] = [
  { key: 'codeQuality', label: 'Code' },
  { key: 'descriptionQuality', label: 'Desc' },
  { key: 'authorReputation', label: 'Author' },
  { key: 'reviewStatus', label: 'Review' },
  { key: 'testCoverage', label: 'Tests' },
  { key: 'overallScore', label: 'Overall' },
];

export default function RankingsPage() {
  const { data } = useAnalysis();
  const [sortBy, setSortBy] = useState<SortKey>('overallScore');
  const [asc, setAsc] = useState(false);

  if (!data) return null;

  const sorted = [...data.prRankings].sort((a, b) => asc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setAsc(!asc);
    else { setSortBy(key); setAsc(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">PR Rankings</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-2 text-gray-400">#</th>
              {columns.map(c => (
                <th
                  key={c.key}
                  className="p-2 text-gray-400 cursor-pointer hover:text-white text-center"
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
                <td className="p-2 font-mono">#{pr.number}</td>
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
