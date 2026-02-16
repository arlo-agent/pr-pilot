'use client';

import { useAnalysis } from '@/lib/context';
import { StatCard } from '@/components/StatCard';
import { ScoreBadge } from '@/components/ScoreBadge';

export default function DashboardPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  const aligned = data.visionAlignments.filter(v => v.alignment === 'aligned');
  const tangential = data.visionAlignments.filter(v => v.alignment === 'tangential');
  const misaligned = data.visionAlignments.filter(v => v.alignment === 'misaligned');
  const total = data.visionAlignments.length;
  const pct = (n: number) => total ? `${((n / total) * 100).toFixed(0)}%` : '—';

  const totalItems = data.totalPRs + data.totalIssues;
  const dupItems = data.duplicateClusters.reduce((s, c) => s + c.items.length, 0);
  const avgScore = data.prRankings.length
    ? data.prRankings.reduce((s, r) => s + r.overallScore, 0) / data.prRankings.length
    : 0;
  const dupPenalty = Math.min(totalItems ? dupItems / totalItems : 0, 0.5);
  const misPenalty = Math.min(total ? misaligned.length / total : 0, 0.5);
  const health = Math.max(0, avgScore - dupPenalty * 0.3 - misPenalty * 0.3);

  const top5 = [...data.prRankings].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);

  const ghUrl = (num: number, type: 'pr' | 'issue' = 'pr') =>
    `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data.repo}</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="PRs Analyzed" value={data.totalPRs} />
        <StatCard label="Issues Analyzed" value={data.totalIssues} />
        <StatCard label="Duplicate Clusters" value={data.duplicateClusters.length} />
        <StatCard label="Ranked PRs" value={data.prRankings.length} />
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Health Score</div>
          <div className="text-2xl font-bold mt-1"><ScoreBadge score={health} /></div>
        </div>
      </div>

      {/* Alignment Breakdown */}
      {total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-3">Vision Alignment</h2>
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600" />
              <span className="text-sm">Aligned: {aligned.length} ({pct(aligned.length)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-600" />
              <span className="text-sm">Tangential: {tangential.length} ({pct(tangential.length)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <span className="text-sm">Misaligned: {misaligned.length} ({pct(misaligned.length)})</span>
            </div>
          </div>
          {/* Simple bar */}
          <div className="flex h-2 rounded-full overflow-hidden mt-3">
            {aligned.length > 0 && <div className="bg-green-600" style={{ width: pct(aligned.length) }} />}
            {tangential.length > 0 && <div className="bg-yellow-600" style={{ width: pct(tangential.length) }} />}
            {misaligned.length > 0 && <div className="bg-red-600" style={{ width: pct(misaligned.length) }} />}
          </div>
        </div>
      )}

      {/* Misaligned warnings */}
      {misaligned.length > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4">
          <h2 className="text-sm text-red-400 font-semibold mb-2">⚠ Misaligned Items</h2>
          {misaligned.map(m => (
            <div key={m.number} className="text-sm text-red-300">
              <a href={ghUrl(m.number, m.type)} target="_blank" rel="noopener" className="font-mono hover:underline">#{m.number}</a>
              {' '}{m.title}
            </div>
          ))}
        </div>
      )}

      {/* Top 5 PRs */}
      {top5.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-3">Top Ranked PRs</h2>
          <div className="space-y-2">
            {top5.map((pr, i) => (
              <div key={pr.number} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-5 text-right">{i + 1}.</span>
                <a href={ghUrl(pr.number)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">
                  #{pr.number}
                </a>
                <ScoreBadge score={pr.overallScore} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm text-gray-400 mb-2">Summary</h2>
        <p className="text-sm whitespace-pre-wrap">{data.summary}</p>
      </div>
    </div>
  );
}
