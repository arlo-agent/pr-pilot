'use client';

import { useAnalysis } from '@/lib/context';
import Markdown from 'react-markdown';

export default function SummaryPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Analysis Summary</h1>
      <div style={{ background: '#18181b', border: '1px solid #27272a', padding: 24 }}>
        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>
          {data.repo} · {new Date(data.analyzedAt).toLocaleString()}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#a1a1aa' }} className="prose prose-invert prose-sm max-w-none [&_a]:text-blue-400 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_strong]:text-white [&_code]:bg-zinc-800 [&_code]:px-1">
          <Markdown>{data.summary}</Markdown>
        </div>
      </div>
    </div>
  );
}
