'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { PRQualitySignals } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';

type SortKey = keyof Pick<PRQualitySignals, 'overallScore' | 'codeQuality' | 'descriptionQuality' | 'authorReputation' | 'reviewStatus' | 'testCoverage' | 'recency' | 'activity'>;

const columns: { key: SortKey; label: string; short: string }[] = [
  { key: 'overallScore', label: 'Overall', short: 'OVR' },
  { key: 'codeQuality', label: 'Code', short: 'CODE' },
  { key: 'descriptionQuality', label: 'Desc', short: 'DESC' },
  { key: 'authorReputation', label: 'Author', short: 'AUTH' },
  { key: 'reviewStatus', label: 'Review', short: 'REV' },
  { key: 'testCoverage', label: 'Tests', short: 'TEST' },
  { key: 'recency', label: 'Recency', short: 'REC' },
  { key: 'activity', label: 'Activity', short: 'ACT' },
];

function ScoreCell({ score }: { score: number }) {
  const variant = score >= 0.7 ? 'success' : score >= 0.3 ? 'warning' : 'destructive';
  return <Badge variant={variant} className="font-mono text-[10px] px-1.5">{(score * 100).toFixed(0)}</Badge>;
}

export default function RankingsPage() {
  const { data } = useAnalysis();
  const [sortBy, setSortBy] = useState<SortKey>('overallScore');
  const [asc, setAsc] = useState(false);

  if (!data) return null;

  if (data.prRankings.length === 0) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">PR Rankings</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No PR rankings available.</CardContent>
        </Card>
      </div>
    );
  }

  const sorted = [...data.prRankings].sort((a, b) => asc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]);
  const handleSort = (key: SortKey) => {
    if (sortBy === key) setAsc(!asc);
    else { setSortBy(key); setAsc(false); }
  };

  const ghUrl = (num: number) => `https://github.com/${data.repo}/pull/${num}`;
  const titleMap = new Map(data.visionAlignments.map(v => [v.number, v.title]));

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PR Rankings</h1>
        <span className="text-sm text-muted-foreground">{sorted.length} PRs</span>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Title</TableHead>
                {columns.map(c => (
                  <TableHead
                    key={c.key}
                    className="text-center cursor-pointer select-none hover:text-foreground w-16"
                    onClick={() => handleSort(c.key)}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[10px] uppercase">{c.short}</span>
                      {sortBy === c.key && (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(pr => (
                <TableRow key={pr.number}>
                  <TableCell>
                    <a href={ghUrl(pr.number)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline text-xs">
                      #{pr.number}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {titleMap.get(pr.number) || `PR #${pr.number}`}
                  </TableCell>
                  {columns.map(c => (
                    <TableCell key={c.key} className="text-center">
                      <ScoreCell score={pr[c.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
