'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';

const alignColors = {
  aligned: 'bg-green-600',
  tangential: 'bg-yellow-600',
  misaligned: 'bg-red-600',
} as const;

type Filter = 'all' | 'aligned' | 'tangential' | 'misaligned';

const filterCounts = (items: { alignment: string }[]) => ({
  all: items.length,
  aligned: items.filter(v => v.alignment === 'aligned').length,
  tangential: items.filter(v => v.alignment === 'tangential').length,
  misaligned: items.filter(v => v.alignment === 'misaligned').length,
});

export default function VisionPage() {
  const { data } = useAnalysis();
  const [filter, setFilter] = useState<Filter>('all');

  if (!data) return null;

  if (data.visionAlignments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Vision Alignment</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No vision alignments available.</p>
          <p className="text-gray-500 text-sm mt-2">Run analysis with <code className="text-gray-300">--vision</code> to enable.</p>
        </div>
      </div>
    );
  }

  const counts = filterCounts(data.visionAlignments);
  const items = filter === 'all' ? data.visionAlignments : data.visionAlignments.filter(v => v.alignment === filter);
  const sorted = [...items].sort((a, b) => b.score - a.score);

  const ghUrl = (num: number, type: 'pr' | 'issue') =>
    `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Vision Alignment</h1>
        <div className="flex gap-2">
          {(['all', 'aligned', 'tangential', 'misaligned'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded transition ${filter === f
                ? f === 'aligned' ? 'bg-green-700 text-white'
                  : f === 'tangential' ? 'bg-yellow-700 text-white'
                    : f === 'misaligned' ? 'bg-red-700 text-white'
                      : 'bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map(v => (
          <div key={v.number} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <a href={ghUrl(v.number, v.type)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">
                #{v.number}
              </a>
              <span className="text-xs text-gray-500 uppercase">{v.type}</span>
              <span className="font-semibold">{v.title}</span>
              <span className={`${alignColors[v.alignment]} text-xs px-2 py-0.5 rounded font-medium`}>{v.alignment}</span>
              <span className="text-xs text-gray-500">{(v.score * 100).toFixed(0)}%</span>
            </div>
            <p className="text-sm text-gray-400">{v.reasoning}</p>
            {v.relevantVisionSection && (
              <p className="text-xs text-gray-500 mt-2 italic">
                Vision section: {v.relevantVisionSection}
              </p>
            )}
          </div>
        ))}
        {sorted.length === 0 && <p className="text-gray-500">No items match this filter.</p>}
      </div>
    </div>
  );
}
