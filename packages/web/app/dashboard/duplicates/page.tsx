'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { DuplicateCluster, PRQualitySignals } from '@/lib/types';
import { ScoreBadge } from '@/components/ScoreBadge';

function ClusterDetail({ cluster, rankings, repo, onBack }: {
  cluster: DuplicateCluster;
  rankings: PRQualitySignals[];
  repo: string;
  onBack: () => void;
}) {
  const rankMap = new Map(rankings.map(r => [r.number, r]));
  const ghUrl = (num: number, type: 'pr' | 'issue') =>
    `https://github.com/${repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  const signals: { key: keyof PRQualitySignals; label: string }[] = [
    { key: 'codeQuality', label: 'Code' },
    { key: 'descriptionQuality', label: 'Desc' },
    { key: 'authorReputation', label: 'Author' },
    { key: 'reviewStatus', label: 'Review' },
    { key: 'testCoverage', label: 'Tests' },
    { key: 'recency', label: 'Recency' },
    { key: 'activity', label: 'Activity' },
    { key: 'overallScore', label: 'Overall' },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">← Back to clusters</button>
      <h2 className="text-xl font-bold">Cluster Detail</h2>
      <p className="text-sm text-gray-400">
        {cluster.items.length} items · Average similarity: <ScoreBadge score={cluster.averageSimilarity} label="sim" />
      </p>

      <div className="space-y-4">
        {cluster.items.map(item => {
          const isBest = item.number === cluster.bestItem;
          const rank = rankMap.get(item.number);
          return (
            <div key={item.number} className={`bg-gray-900 border rounded-lg p-4 ${isBest ? 'border-green-600' : 'border-gray-800'}`}>
              <div className="flex items-center gap-3 mb-2">
                {isBest && <span className="bg-green-700 text-xs px-2 py-0.5 rounded font-semibold">⭐ Best</span>}
                <a href={ghUrl(item.number, item.type)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">
                  #{item.number}
                </a>
                <span className="text-xs text-gray-500 uppercase">{item.type}</span>
                <span className="font-semibold">{item.title}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Similarity: {(item.similarity * 100).toFixed(0)}%
              </div>
              {rank && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {signals.map(s => (
                    <ScoreBadge key={s.key} score={rank[s.key] as number} label={s.label} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DuplicatesPage() {
  const { data } = useAnalysis();
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  if (!data) return null;

  if (selectedCluster !== null && data.duplicateClusters[selectedCluster]) {
    return (
      <ClusterDetail
        cluster={data.duplicateClusters[selectedCluster]}
        rankings={data.prRankings}
        repo={data.repo}
        onBack={() => setSelectedCluster(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Duplicate Clusters ({data.duplicateClusters.length})</h1>
      {data.duplicateClusters.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-green-400 text-lg">✓ No duplicate clusters found!</p>
          <p className="text-gray-500 text-sm mt-2">All PRs and issues are unique.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.duplicateClusters.map((c, i) => {
          const best = c.items.find(it => it.number === c.bestItem);
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCluster(i)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{c.items.length} items</span>
                <ScoreBadge score={c.averageSimilarity} label="sim" />
              </div>
              {best && (
                <div className="text-sm mb-2">
                  <span className="text-green-400">⭐ #{best.number}</span>{' '}
                  <span className="text-gray-300">{best.title.slice(0, 50)}</span>
                </div>
              )}
              <ul className="space-y-1">
                {c.items.filter(it => it.number !== c.bestItem).slice(0, 3).map(item => (
                  <li key={item.number} className="text-sm text-gray-400">
                    <span className="font-mono">#{item.number}</span> {item.title.slice(0, 40)}
                  </li>
                ))}
              </ul>
              {c.items.length > 4 && (
                <div className="text-xs text-gray-500 mt-2">+{c.items.length - 4} more…</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
