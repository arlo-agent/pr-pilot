'use client';

import { useAnalysis } from '@/lib/context';
import { StatCard } from '@/components/StatCard';

export default function DashboardPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  const misaligned = data.visionAlignments.filter(v => v.alignment === 'misaligned').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data.repo}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="PRs Analyzed" value={data.totalPRs} />
        <StatCard label="Issues Analyzed" value={data.totalIssues} />
        <StatCard label="Duplicate Clusters" value={data.duplicateClusters.length} />
        <StatCard label="Misaligned" value={misaligned} />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm text-gray-400 mb-2">Summary</h2>
        <p className="text-sm whitespace-pre-wrap">{data.summary}</p>
      </div>
    </div>
  );
}
