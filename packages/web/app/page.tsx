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
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold">🚀 PR Pilot</h1>
        <p className="text-gray-400">Load analysis data to explore the dashboard.</p>

        <button
          onClick={handleLoadFromServer}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-gray-400 px-6 py-3 rounded-lg font-semibold transition"
        >
          {loading ? 'Loading…' : 'Load from Server (.pr-pilot-state.json)'}
        </button>

        <div className="flex items-center gap-4 text-gray-500 text-sm">
          <div className="flex-1 border-t border-gray-800" />
          or paste JSON
          <div className="flex-1 border-t border-gray-800" />
        </div>

        <textarea
          className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
          placeholder='Paste JSON from `pr-pilot scan --json`...'
          value={json}
          onChange={e => { setJson(e.target.value); setError(''); }}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handlePaste}
          className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition"
        >
          Load from JSON
        </button>
      </div>
    </div>
  );
}
