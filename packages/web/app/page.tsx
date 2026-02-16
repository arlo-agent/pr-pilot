'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/lib/context';
import { AnalysisResult } from '@/lib/types';

function LandingInner() {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const { setData } = useAnalysis();
  const router = useRouter();

  const handleSubmit = () => {
    try {
      const parsed: AnalysisResult = JSON.parse(json);
      if (!parsed.repo || !parsed.prRankings) throw new Error('Invalid AnalysisResult');
      setData(parsed);
      router.push('/dashboard');
    } catch {
      setError('Invalid JSON. Paste output from `pr-pilot scan --json`.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold">🚀 PR Pilot</h1>
        <p className="text-gray-400">Paste your PR Pilot JSON output to explore the analysis.</p>
        <textarea
          className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
          placeholder='Paste JSON from `pr-pilot scan --json`...'
          value={json}
          onChange={e => { setJson(e.target.value); setError(''); }}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-semibold transition"
        >
          Load Dashboard
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return <LandingInner />;
}
