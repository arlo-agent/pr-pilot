'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';

const alignColors = {
  aligned: 'bg-green-600',
  tangential: 'bg-yellow-600',
  misaligned: 'bg-red-600',
} as const;

type Filter = 'all' | 'aligned' | 'tangential' | 'misaligned';

export default function VisionPage() {
  const { data } = useAnalysis();
  const [filter, setFilter] = useState<Filter>('all');

  if (!data) return null;

  const items = filter === 'all' ? data.visionAlignments : data.visionAlignments.filter(v => v.alignment === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vision Alignment</h1>
        <div className="flex gap-2">
          {(['all', 'aligned', 'tangential', 'misaligned'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded ${filter === f ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {items.map(v => (
          <div key={v.number} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-gray-500">#{v.number}</span>
              <span className="font-semibold">{v.title}</span>
              <span className={`${alignColors[v.alignment]} text-xs px-2 py-0.5 rounded`}>{v.alignment}</span>
              <span className="text-xs text-gray-500">{v.type}</span>
            </div>
            <p className="text-sm text-gray-400">{v.reasoning}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500">No items match this filter.</p>}
      </div>
    </div>
  );
}
