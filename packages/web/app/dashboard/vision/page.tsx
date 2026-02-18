'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

type Filter = 'all' | 'aligned' | 'tangential' | 'misaligned';

const alignmentBadge = {
  aligned: 'success' as const,
  tangential: 'warning' as const,
  misaligned: 'destructive' as const,
};

export default function VisionPage() {
  const { data } = useAnalysis();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  if (!data) return null;
  const visionAlignments = data.visionAlignments ?? [];

  if (visionAlignments.length === 0) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">Vision Alignment</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No vision alignments available.</p>
            <p className="text-xs mt-1">Run analysis with <code className="text-foreground">--vision</code> to enable.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const counts = {
    all: visionAlignments.length,
    aligned: visionAlignments.filter(v => v.alignment === 'aligned').length,
    tangential: visionAlignments.filter(v => v.alignment === 'tangential').length,
    misaligned: visionAlignments.filter(v => v.alignment === 'misaligned').length,
  };

  let items = filter === 'all' ? visionAlignments : visionAlignments.filter(v => v.alignment === filter);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(v => v.title.toLowerCase().includes(q) || v.reasoning.toLowerCase().includes(q) || String(v.number).includes(q));
  }
  const sorted = [...items].sort((a, b) => b.score - a.score);

  const ghUrl = (num: number, type: 'pr' | 'issue') =>
    `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Vision Alignment</h1>
        <div className="flex gap-1.5">
          {(['all', 'aligned', 'tangential', 'misaligned'] as Filter[]).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f} ({counts[f]})
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, number, or reasoning..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {sorted.map(v => (
          <Card key={v.number} className="hover:border-muted-foreground/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <a href={ghUrl(v.number, v.type)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline text-sm">#{v.number}</a>
                <Badge variant="outline" className="text-[10px] uppercase">{v.type}</Badge>
                <span className="text-sm font-medium flex-1">{v.title}</span>
                <Badge variant={alignmentBadge[v.alignment]} className="uppercase text-[10px]">{v.alignment}</Badge>
                <span className="text-xs font-mono text-muted-foreground">{(v.score * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{v.reasoning}</p>
              {v.relevantVisionSection && (
                <p className="text-[10px] text-muted-foreground/70 mt-2 italic">
                  Section: {v.relevantVisionSection}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && <p className="text-muted-foreground text-center py-8">No items match.</p>}
      </div>
    </div>
  );
}
