'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/lib/context';
import { AnalysisResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">PR PILOT</h1>
            <p className="text-sm text-muted-foreground mt-1">Load analysis data to explore the dashboard.</p>
          </div>

          <Button
            onClick={handleLoadFromServer}
            disabled={loading}
            className="w-full h-12 text-sm font-semibold"
          >
            {loading ? 'Loading…' : 'Load from Server (.pr-pilot-state.json)'}
          </Button>

          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <Separator className="flex-1" />
            or paste JSON
            <Separator className="flex-1" />
          </div>

          <textarea
            className="w-full h-48 bg-secondary border px-4 py-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
            placeholder='Paste JSON from `pr-pilot scan --json`...'
            value={json}
            onChange={e => { setJson(e.target.value); setError(''); }}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button variant="secondary" onClick={handlePaste} className="w-full">
            Load from JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
