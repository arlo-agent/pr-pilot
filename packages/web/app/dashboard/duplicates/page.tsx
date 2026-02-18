'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/context';
import { DuplicateCluster, PRQualitySignals } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const variant = score >= 0.7 ? 'success' : score >= 0.3 ? 'warning' : 'destructive';
  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {label && <span className="opacity-70 mr-0.5">{label}</span>}
      {(score * 100).toFixed(0)}
    </Badge>
  );
}

function ClusterDetail({ cluster, rankings, repo, onBack }: {
  cluster: DuplicateCluster;
  rankings: PRQualitySignals[];
  repo: string;
  onBack: () => void;
}) {
  const rankMap = new Map(rankings.map(r => [r.number, r]));
  const ghUrl = (num: number, type: 'pr' | 'issue') =>
    `https://github.com/${repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  const signals: { key: keyof PRQualitySignals; label: string }[] = [
    { key: 'codeQuality', label: 'Code' },
    { key: 'descriptionQuality', label: 'Desc' },
    { key: 'authorReputation', label: 'Auth' },
    { key: 'reviewStatus', label: 'Rev' },
    { key: 'testCoverage', label: 'Test' },
    { key: 'recency', label: 'Rec' },
    { key: 'activity', label: 'Act' },
    { key: 'overallScore', label: 'OVR' },
  ];

  return (
    <div className="max-w-4xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clusters
      </Button>
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Cluster Detail</h2>
        <Badge variant="outline" className="font-mono">{cluster.items.length} items</Badge>
        <ScoreBadge score={cluster.averageSimilarity} label="sim" />
      </div>

      <Card className="border-yellow-900/50">
        <CardContent className="p-4 text-sm text-yellow-400">
          💡 Suggestion: Keep <span className="font-mono text-green-400">#{cluster.bestItem}</span> and close the others as duplicates.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {cluster.items.map(item => {
          const isBest = item.number === cluster.bestItem;
          const rank = rankMap.get(item.number);
          return (
            <Card key={item.number} className={isBest ? 'border-green-800' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {isBest && <Badge variant="success" className="text-[10px]">⭐ KEEP</Badge>}
                  {!isBest && <Badge variant="destructive" className="text-[10px]">CLOSE</Badge>}
                  <a href={ghUrl(item.number, item.type)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline text-sm">#{item.number}</a>
                  <Badge variant="outline" className="text-[10px] uppercase">{item.type}</Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Similarity: {(item.similarity * 100).toFixed(0)}%
                </div>
                {rank && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {signals.map(s => (
                      <ScoreBadge key={s.key} score={rank[s.key] as number} label={s.label} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function DuplicatesPage() {
  const { data } = useAnalysis();
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  if (!data) return null;
  const duplicateClusters = data.duplicateClusters ?? [];
  const prRankings = data.prRankings ?? [];

  if (selectedCluster !== null && duplicateClusters[selectedCluster]) {
    return (
      <ClusterDetail
        cluster={duplicateClusters[selectedCluster]}
        rankings={prRankings}
        repo={data.repo}
        onBack={() => setSelectedCluster(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Duplicate Clusters</h1>
        <span className="text-sm text-muted-foreground">{duplicateClusters.length} clusters</span>
      </div>

      {duplicateClusters.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-green-400 text-lg font-semibold">✓ No duplicates detected</p>
            <p className="text-muted-foreground text-sm mt-1">All PRs and issues are unique.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {duplicateClusters.map((c, i) => {
          const best = c.items.find(it => it.number === c.bestItem);
          return (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-muted-foreground/30 transition-colors"
              onClick={() => setSelectedCluster(i)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="font-mono text-[10px]">{c.items.length} items</Badge>
                  <ScoreBadge score={c.averageSimilarity} label="sim" />
                </div>
                {best && (
                  <div className="text-sm mb-2">
                    <span className="font-mono text-green-400">#{best.number}</span>{' '}
                    <span className="text-muted-foreground">{best.title.slice(0, 60)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <ul className="space-y-1">
                  {c.items.filter(it => it.number !== c.bestItem).slice(0, 3).map(item => (
                    <li key={item.number} className="text-xs text-muted-foreground">
                      <span className="font-mono text-red-400">#{item.number}</span> {item.title.slice(0, 50)}
                    </li>
                  ))}
                </ul>
                {c.items.length > 4 && (
                  <div className="text-[10px] text-muted-foreground mt-2">+{c.items.length - 4} more</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
