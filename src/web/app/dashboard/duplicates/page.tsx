'use client';

import { useAnalysis } from '@/lib/context';
import { ClusterCard } from '@/components/ClusterCard';

export default function DuplicatesPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Duplicate Clusters</h1>
      {data.duplicateClusters.length === 0 && (
        <p className="text-gray-500">No duplicates found.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.duplicateClusters.map(c => (
          <ClusterCard key={c.id} cluster={c} />
        ))}
      </div>
    </div>
  );
}
