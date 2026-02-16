'use client';

import { useState } from 'react';
import { DuplicateCluster } from '@/lib/types';
import { ScoreBadge } from './ScoreBadge';

export function ClusterCard({ cluster }: { cluster: DuplicateCluster }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{cluster.items.length} items</span>
        <ScoreBadge score={cluster.averageSimilarity} label="sim" />
      </div>
      <ul className="space-y-1">
        {cluster.items.slice(0, expanded ? undefined : 3).map(item => (
          <li key={item.number} className="text-sm flex items-center gap-2">
            <span className="text-gray-500 font-mono">#{item.number}</span>
            <span className={item.number === cluster.bestItem ? 'text-green-400 font-semibold' : ''}>
              {item.title}
            </span>
            {item.number === cluster.bestItem && (
              <span className="bg-green-700 text-xs px-1.5 py-0.5 rounded">best</span>
            )}
          </li>
        ))}
      </ul>
      {!expanded && cluster.items.length > 3 && (
        <div className="text-xs text-gray-500 mt-2">+{cluster.items.length - 3} more…</div>
      )}
    </div>
  );
}
