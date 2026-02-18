'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/lib/context';
import { AnalysisResult } from '@/lib/types';

export default function Home() {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setData } = useAnalysis();
  const router = useRouter();

  const loadData = (parsed: AnalysisResult) => {
    if (!parsed.repo) throw new Error('Invalid data: missing repo');
    setData(parsed);
    router.push('/dashboard');
  };

  const handlePaste = () => {
    try {
      loadData(JSON.parse(json));
    } catch {
      setError('Invalid JSON. Paste output from `pr-pilot scan --json`.');
    }
  };

  const handleLoadFromServer = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/load');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      loadData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load from server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div style={{ maxWidth: 640, width: '100%', background: '#18181b', border: '1px solid #27272a', padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.025em', color: '#fafafa', margin: 0 }}>PR PILOT</h1>
          <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Load analysis data to explore the dashboard.</p>
        </div>

        <button
          onClick={handleLoadFromServer}
          disabled={loading}
          style={{
            width: '100%', height: 48, background: '#3b82f6', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', marginBottom: 20,
          }}
        >
          {loading ? 'Loading…' : 'Load from Server (.pr-pilot-state.json)'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#a1a1aa', fontSize: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#27272a' }} />
          or paste JSON
          <div style={{ flex: 1, height: 1, background: '#27272a' }} />
        </div>

        <textarea
          style={{
            width: '100%', height: 192, background: '#09090b', border: '1px solid #27272a',
            padding: 12, fontFamily: 'monospace', fontSize: 12, color: '#fafafa', resize: 'none', outline: 'none',
          }}
          placeholder='Paste JSON from `pr-pilot scan --json`...'
          value={json}
          onChange={e => { setJson(e.target.value); setError(''); }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</p>}
        <button
          onClick={handlePaste}
          style={{
            width: '100%', height: 40, background: '#27272a', color: '#fafafa', border: '1px solid #3f3f46',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', marginTop: 12,
          }}
        >
          Load from JSON
        </button>
      </div>
    </div>
  );
}
