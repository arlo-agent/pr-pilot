'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';

type Filter = 'all' | 'aligned' | 'tangential' | 'misaligned';

const badgeColors = { aligned: '#22c55e', tangential: '#eab308', misaligned: '#ef4444' };
const badgeBg = { aligned: '#14532d', tangential: '#422006', misaligned: '#450a0a' };

export default function VisionPage() {
  const { data } = useAnalysis();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  if (!data) return null;
  const va = data.visionAlignments ?? [];

  if (va.length === 0) {
    return (
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Vision Alignment</h1>
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: 32, textAlign: 'center', color: '#a1a1aa' }}>
          <p>No vision alignments available.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Run analysis with <code style={{ color: '#fafafa' }}>--vision</code> to enable.</p>
        </div>
      </div>
    );
  }

  const counts = {
    all: va.length,
    aligned: va.filter(v => v.alignment === 'aligned').length,
    tangential: va.filter(v => v.alignment === 'tangential').length,
    misaligned: va.filter(v => v.alignment === 'misaligned').length,
  };

  let items = filter === 'all' ? va : va.filter(v => v.alignment === filter);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(v => v.title.toLowerCase().includes(q) || v.reasoning.toLowerCase().includes(q) || String(v.number).includes(q));
  }

  const ghUrl = (num: number, type: string) => `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  const filterBtns: Filter[] = ['all', 'aligned', 'tangential', 'misaligned'];

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Vision Alignment</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {filterBtns.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                background: filter === f ? '#3b82f6' : '#27272a', color: filter === f ? '#fff' : '#a1a1aa',
                border: filter === f ? 'none' : '1px solid #3f3f46',
              }}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          placeholder="Search by title, number, or reasoning..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 36px', background: '#18181b', border: '1px solid #27272a',
            color: '#fafafa', fontSize: 13, outline: 'none',
          }}
        />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: 14 }}>⌕</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(v => (
          <div key={v.number} style={{ background: '#18181b', border: '1px solid #27272a', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <a href={ghUrl(v.number, v.type)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: 13 }}>#{v.number}</a>
              <span style={{ fontSize: 10, color: '#a1a1aa', background: '#27272a', padding: '2px 6px', textTransform: 'uppercase' }}>{v.type}</span>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{v.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: badgeColors[v.alignment], background: badgeBg[v.alignment], padding: '3px 8px' }}>{v.alignment}</span>
            </div>
            <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0 }}>{v.reasoning}</p>
          </div>
        ))}
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#a1a1aa', padding: 32 }}>No items match.</p>}
      </div>
    </div>
  );
}
