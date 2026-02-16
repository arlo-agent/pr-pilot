'use client';

export function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const bg = score >= 0.7 ? 'bg-green-600' : score >= 0.3 ? 'bg-yellow-600' : 'bg-red-600';
  return (
    <span className={`${bg} text-white text-xs font-mono px-2 py-0.5 rounded`}>
      {label && <span className="opacity-70 mr-1">{label}</span>}
      {(score * 100).toFixed(0)}
    </span>
  );
}
