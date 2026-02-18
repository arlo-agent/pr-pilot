'use client';

import { useAnalysis } from '@/lib/context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/dashboard/rankings', label: 'Rankings', icon: '⏶' },
  { href: '/dashboard/duplicates', label: 'Duplicates', icon: '⧉' },
  { href: '/dashboard/vision', label: 'Vision', icon: '◉' },
  { href: '/dashboard/summary', label: 'Summary', icon: '☰' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data } = useAnalysis();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!data) router.replace('/');
  }, [data, router]);

  if (!data) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48,
        background: '#18181b', borderBottom: '1px solid #27272a',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16,
      }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 20, display: 'none' }}
          className="max-lg:!inline-block"
        >
          ☰
        </button>
        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.025em', color: '#fafafa' }}>PR PILOT</span>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, color: '#a1a1aa' }}>{data.repo}</span>
        <span style={{ fontSize: 11, color: '#71717a', display: 'none' }} className="sm:!inline">{new Date(data.analyzedAt).toLocaleString()}</span>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} className="lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed', top: 48, left: 0, zIndex: 50, height: 'calc(100vh - 48px)', width: 240,
          background: '#18181b', borderRight: '1px solid #27272a',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s',
        }}
        className="lg:!translate-x-0"
      >
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 12 }}>
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', fontSize: 14,
                  color: active ? '#fafafa' : '#a1a1aa', background: active ? '#27272a' : 'transparent',
                  fontWeight: active ? 600 : 400, textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ paddingTop: 48 }} className="lg:pl-[240px]">
        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}
