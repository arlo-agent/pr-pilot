'use client';

import { useAnalysis } from '@/lib/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Markdown from 'react-markdown';

function HeroStat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
        <div className={`text-5xl xl:text-6xl font-black tabular-nums tracking-tight leading-none ${color || 'text-foreground'}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  const visionAlignments = data.visionAlignments ?? [];
  const duplicateClusters = data.duplicateClusters ?? [];
  const prRankings = data.prRankings ?? [];

  const aligned = visionAlignments.filter(v => v.alignment === 'aligned');
  const tangential = visionAlignments.filter(v => v.alignment === 'tangential');
  const misaligned = visionAlignments.filter(v => v.alignment === 'misaligned');
  const total = visionAlignments.length;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  const totalItems = (data.totalPRs ?? 0) + (data.totalIssues ?? 0);
  const dupItems = duplicateClusters.reduce((s, c) => s + c.items.length, 0);
  const avgScore = prRankings.length
    ? prRankings.reduce((s, r) => s + r.overallScore, 0) / prRankings.length
    : 0;
  const dupPenalty = Math.min(totalItems ? dupItems / totalItems : 0, 0.5);
  const misPenalty = Math.min(total ? misaligned.length / total : 0, 0.5);
  const health = Math.max(0, avgScore - dupPenalty * 0.3 - misPenalty * 0.3);
  const healthColor = health >= 0.7 ? 'text-green-500' : health >= 0.3 ? 'text-yellow-500' : 'text-red-500';

  const alignPct = pct(aligned.length);
  const alignColor = alignPct >= 70 ? 'text-green-500' : alignPct >= 40 ? 'text-yellow-500' : 'text-red-500';

  const top5 = [...prRankings].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  const ghUrl = (num: number, type: 'pr' | 'issue' = 'pr') =>
    `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;

  // Title map from vision alignments
  const titleMap = new Map(visionAlignments.map(v => [v.number, v.title]));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <HeroStat label="Total PRs" value={data.totalPRs} />
        <HeroStat label="Total Issues" value={data.totalIssues} />
        <HeroStat label="Dup Clusters" value={duplicateClusters.length} />
        <HeroStat label="Health Score" value={(health * 100).toFixed(0)} sub="/ 100" color={healthColor} />
        <HeroStat label="Vision Aligned" value={`${alignPct}%`} sub={`${aligned.length} of ${total}`} color={alignColor} />
      </div>

      {/* Vision Alignment Bar */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vision Alignment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 overflow-hidden">
              {aligned.length > 0 && <div className="bg-green-600 transition-all" style={{ width: `${pct(aligned.length)}%` }} />}
              {tangential.length > 0 && <div className="bg-yellow-600 transition-all" style={{ width: `${pct(tangential.length)}%` }} />}
              {misaligned.length > 0 && <div className="bg-red-600 transition-all" style={{ width: `${pct(misaligned.length)}%` }} />}
            </div>
            <div className="flex gap-6 mt-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-600 inline-block" /> Aligned {aligned.length} ({pct(aligned.length)}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-600 inline-block" /> Tangential {tangential.length} ({pct(tangential.length)}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-600 inline-block" /> Misaligned {misaligned.length} ({pct(misaligned.length)}%)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Misaligned warnings */}
        {misaligned.length > 0 && (
          <Card className="border-red-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                ⚠ Misaligned Items — Review Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {misaligned.map(m => (
                <div key={m.number} className="text-sm">
                  <a href={ghUrl(m.number, m.type)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">#{m.number}</a>
                  {' '}<span className="text-muted-foreground">{m.title}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top PRs to review */}
        {top5.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Top Ranked PRs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {top5.map((pr, i) => (
                <div key={pr.number} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 text-right tabular-nums">{i + 1}.</span>
                  <a href={ghUrl(pr.number)} target="_blank" rel="noopener" className="font-mono text-blue-400 hover:underline">#{pr.number}</a>
                  <span className="text-muted-foreground truncate flex-1">{titleMap.get(pr.number) || ''}</span>
                  <Badge variant={pr.overallScore >= 0.7 ? 'success' : pr.overallScore >= 0.3 ? 'warning' : 'destructive'} className="font-mono">
                    {(pr.overallScore * 100).toFixed(0)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Duplicate clusters needing action */}
        {duplicateClusters.length > 0 && (
          <Card className="border-yellow-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-400">Duplicate Clusters — Close Candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {duplicateClusters.slice(0, 5).map(c => {
                const best = c.items.find(it => it.number === c.bestItem);
                const dupes = c.items.filter(it => it.number !== c.bestItem);
                return (
                  <div key={c.id} className="text-sm">
                    <span className="text-muted-foreground">Keep </span>
                    {best && <a href={ghUrl(best.number, best.type)} target="_blank" rel="noopener" className="font-mono text-green-400 hover:underline">#{best.number}</a>}
                    <span className="text-muted-foreground">, close </span>
                    {dupes.slice(0, 3).map((d, i) => (
                      <span key={d.number}>
                        {i > 0 && ', '}
                        <a href={ghUrl(d.number, d.type)} target="_blank" rel="noopener" className="font-mono text-red-400 hover:underline">#{d.number}</a>
                      </span>
                    ))}
                    {dupes.length > 3 && <span className="text-muted-foreground"> +{dupes.length - 3} more</span>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-invert prose-sm max-w-none text-sm text-muted-foreground [&_a]:text-blue-400 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
          <Markdown>{data.summary}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}
