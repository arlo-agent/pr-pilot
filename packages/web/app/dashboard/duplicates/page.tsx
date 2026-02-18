'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';

const cardStyle = { background: '#18181b', border: '1px solid #27272a', padding: 16 };

export default function DuplicatesPage() {
  const { data } = useAnalysis();
  const [selected, setSelected] = useState<number | null>(null);

  if (!data) return null;
  const dc = data.duplicateClusters ?? [];
  const pr = data.prRankings ?? [];
  const rankMap = new Map(pr.map(r => [r.number, r]));
  const ghUrl = (num: number, type: string) => `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;
  const scoreColor = (s: number) => s >= 0.7 ? '#22c55e' : s >= 0.3 ? '#eab308' : '#ef4444';

  if (dc.length === 0) {
    return (
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Duplicate Clusters</h1>
        <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
          <p style={{ color: '#22c55e', fontSize: 18, fontWeight: 600 }}>✓ No duplicates detected</p>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4 }}>All PRs and issues are unique.</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selected !== null && dc[selected]) {
    const c = dc[selected];
    const best = c.items.find(it => it.number === c.bestItem);
    const signals = ['codeQuality', 'descriptionQuality', 'authorReputation', 'reviewStatus', 'testCoverage', 'recency', 'activity', 'overallScore'] as const;

    return (
      <div style={{ maxWidth: 800 }}>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Back to clusters</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Cluster Detail</h2>
          <span style={{ fontSize: 11, color: '#a1a1aa', background: '#27272a', padding: '2px 8px', fontFamily: 'monospace' }}>{c.items.length} items</span>
          <span style={{ fontSize: 11, color: '#eab308', background: '#27272a', padding: '2px 8px', fontFamily: 'monospace' }}>sim {(c.averageSimilarity * 100).toFixed(0)}%</span>
        </div>
        <div style={{ ...cardStyle, borderColor: '#78350f', background: 'rgba(120,53,15,0.15)', marginBottom: 16, fontSize: 13, color: '#eab308' }}>
          💡 Keep <span style={{ fontFamily: 'monospace', color: '#22c55e' }}>#{c.bestItem}</span> and close the others as duplicates.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.items.map(item => {
            const isBest = item.number === c.bestItem;
            const rank = rankMap.get(item.number);
            return (
              <div key={item.number} style={{ ...cardStyle, borderColor: isBest ? '#166534' : '#27272a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', color: '#fff', background: isBest ? '#166534' : '#991b1b' }}>{isBest ? '⭐ KEEP' : 'CLOSE'}</span>
                  <a href={ghUrl(item.number, item.type)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: 13 }}>#{item.number}</a>
                  <span style={{ fontSize: 10, color: '#a1a1aa', background: '#27272a', padding: '2px 6px', textTransform: 'uppercase' }}>{item.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>Similarity: {(item.similarity * 100).toFixed(0)}%</div>
                {rank && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {signals.map(s => (
                      <span key={s} style={{ fontSize: 10, fontFamily: 'monospace', color: scoreColor(rank[s] as number), background: '#27272a', padding: '2px 6px' }}>
                        {s.slice(0, 4).toUpperCase()} {((rank[s] as number) * 100).toFixed(0)}
                      </span>
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

  // List view
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Duplicate Clusters</h1>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>{dc.length} clusters</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="max-lg:!grid-cols-2 max-sm:!grid-cols-1">
        {dc.map((c, i) => {
          const best = c.items.find(it => it.number === c.bestItem);
          const dupes = c.items.filter(it => it.number !== c.bestItem);
          return (
            <div key={i} onClick={() => setSelected(i)} style={{ ...cardStyle, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#a1a1aa', background: '#27272a', padding: '2px 8px', fontFamily: 'monospace' }}>{c.items.length} items</span>
                <span style={{ fontSize: 11, color: '#eab308', background: '#27272a', padding: '2px 8px', fontFamily: 'monospace' }}>sim {(c.averageSimilarity * 100).toFixed(0)}%</span>
              </div>
              {best && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', color: '#22c55e' }}>#{best.number}</span>{' '}
                  <span style={{ color: '#a1a1aa' }}>{best.title.slice(0, 60)}</span>
                </div>
              )}
              <div style={{ height: 1, background: '#27272a', margin: '8px 0' }} />
              {dupes.slice(0, 3).map(d => (
                <div key={d.number} style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>#{d.number}</span> {d.title.slice(0, 50)}
                </div>
              ))}
              {dupes.length > 3 && <div style={{ fontSize: 10, color: '#71717a', marginTop: 4 }}>+{dupes.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
