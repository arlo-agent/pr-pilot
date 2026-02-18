'use client';

import { useAnalysis } from '@/lib/context';
import Markdown from 'react-markdown';

const cardStyle = { background: '#18181b', border: '1px solid #27272a', padding: 20 };
const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: 8 };
const bigNumStyle = { fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as const };

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ ...bigNumStyle, color: color || '#fafafa' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  const va = data.visionAlignments ?? [];
  const dc = data.duplicateClusters ?? [];
  const pr = data.prRankings ?? [];

  const aligned = va.filter(v => v.alignment === 'aligned');
  const tangential = va.filter(v => v.alignment === 'tangential');
  const misaligned = va.filter(v => v.alignment === 'misaligned');
  const total = va.length;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  const totalItems = (data.totalPRs ?? 0) + (data.totalIssues ?? 0);
  const dupItems = dc.reduce((s, c) => s + c.items.length, 0);
  const avgScore = pr.length ? pr.reduce((s, r) => s + r.overallScore, 0) / pr.length : 0;
  const dupPenalty = Math.min(totalItems ? dupItems / totalItems : 0, 0.5);
  const misPenalty = Math.min(total ? misaligned.length / total : 0, 0.5);
  const health = Math.max(0, avgScore - dupPenalty * 0.3 - misPenalty * 0.3);
  const healthColor = health >= 0.7 ? '#22c55e' : health >= 0.3 ? '#eab308' : '#ef4444';

  const alignPct = pct(aligned.length);
  const alignColor = alignPct >= 70 ? '#22c55e' : alignPct >= 40 ? '#eab308' : '#ef4444';

  const top5 = [...pr].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  const ghUrl = (num: number, type: string = 'pr') =>
    `https://github.com/${data.repo}/${type === 'pr' ? 'pull' : 'issues'}/${num}`;
  const titleMap = new Map(va.map(v => [v.number, v.title]));

  const scoreColor = (s: number) => s >= 0.7 ? '#22c55e' : s >= 0.3 ? '#eab308' : '#ef4444';

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }} className="max-lg:!grid-cols-2 max-sm:!grid-cols-1">
        <StatCard label="Total PRs" value={data.totalPRs} />
        <StatCard label="Total Issues" value={data.totalIssues} />
        <StatCard label="Dup Clusters" value={dc.length} />
        <StatCard label="Health Score" value={(health * 100).toFixed(0)} sub="/ 100" color={healthColor} />
        <StatCard label="Vision Aligned" value={`${alignPct}%`} sub={`${aligned.length} of ${total}`} color={alignColor} />
      </div>

      {/* Vision Alignment Bar */}
      {total > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={labelStyle}>Vision Alignment Distribution</div>
          <div style={{ display: 'flex', height: 12, overflow: 'hidden', marginBottom: 12 }}>
            {aligned.length > 0 && <div style={{ width: `${pct(aligned.length)}%`, background: '#16a34a' }} />}
            {tangential.length > 0 && <div style={{ width: `${pct(tangential.length)}%`, background: '#ca8a04' }} />}
            {misaligned.length > 0 && <div style={{ width: `${pct(misaligned.length)}%`, background: '#dc2626' }} />}
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
            <span style={{ color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#16a34a', marginRight: 6 }} />Aligned {aligned.length} ({pct(aligned.length)}%)</span>
            <span style={{ color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ca8a04', marginRight: 6 }} />Tangential {tangential.length} ({pct(tangential.length)}%)</span>
            <span style={{ color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#dc2626', marginRight: 6 }} />Misaligned {misaligned.length} ({pct(misaligned.length)}%)</span>
          </div>
        </div>
      )}

      {/* Action Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="max-lg:!grid-cols-1">
        {/* Misaligned Warnings */}
        {misaligned.length > 0 && (
          <div style={{ ...cardStyle, borderColor: '#7f1d1d', background: 'rgba(127,29,29,0.15)' }}>
            <div style={{ ...labelStyle, color: '#ef4444' }}>⚠ Misaligned Items — Review Required</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {misaligned.map(m => (
                <div key={m.number} style={{ fontSize: 13 }}>
                  <a href={ghUrl(m.number, m.type)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>#{m.number}</a>
                  {' '}<span style={{ color: '#a1a1aa' }}>{m.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top PRs */}
        {top5.length > 0 && (
          <div style={cardStyle}>
            <div style={labelStyle}>Top Ranked PRs</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {top5.map((p, i) => (
                <div key={p.number} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                  <span style={{ color: '#71717a', width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
                  <a href={ghUrl(p.number)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>#{p.number}</a>
                  <span style={{ color: '#a1a1aa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleMap.get(p.number) || ''}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: scoreColor(p.overallScore), background: '#27272a', padding: '2px 8px' }}>
                    {(p.overallScore * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duplicate Clusters */}
        {dc.length > 0 && (
          <div style={{ ...cardStyle, borderColor: '#78350f' }}>
            <div style={{ ...labelStyle, color: '#eab308' }}>Duplicate Clusters — Close Candidates</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dc.slice(0, 5).map(c => {
                const best = c.items.find(it => it.number === c.bestItem);
                const dupes = c.items.filter(it => it.number !== c.bestItem);
                return (
                  <div key={c.items.map(i => i.number).join('-')} style={{ fontSize: 13 }}>
                    <span style={{ color: '#a1a1aa' }}>Keep </span>
                    {best && <a href={ghUrl(best.number, best.type)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#22c55e' }}>#{best.number}</a>}
                    <span style={{ color: '#a1a1aa' }}>, close </span>
                    {dupes.slice(0, 3).map((d, i) => (
                      <span key={d.number}>
                        {i > 0 && ', '}
                        <a href={ghUrl(d.number, d.type)} target="_blank" rel="noopener" style={{ fontFamily: 'monospace', color: '#ef4444' }}>#{d.number}</a>
                      </span>
                    ))}
                    {dupes.length > 3 && <span style={{ color: '#71717a' }}> +{dupes.length - 3} more</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ ...cardStyle, borderTop: '2px solid #27272a' }}>
        <div style={labelStyle}>Analysis Summary</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#a1a1aa' }} className="prose prose-invert prose-sm max-w-none [&_a]:text-blue-400 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_strong]:text-white">
          <Markdown>{data.summary}</Markdown>
        </div>
      </div>
    </div>
  );
}
