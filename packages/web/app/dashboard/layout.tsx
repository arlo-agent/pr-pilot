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
          className="lg:hidden"
          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 20 }}
        >
          ☰
        </button>
        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.025em', color: '#fafafa' }}>PR PILOT</span>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, color: '#a1a1aa' }}>{data.repo}</span>
        <span className="hidden sm:inline" style={{ fontSize: 11, color: '#71717a' }}>{data.analyzedAt ? new Date(data.analyzedAt).toLocaleString() : ''}</span>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} className="lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop: always visible; mobile: toggled */}
      <aside
        className={`fixed top-[48px] left-0 z-50 h-[calc(100vh-48px)] w-[240px] border-r transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: '#18181b', borderColor: '#27272a' }}
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
      <main className="pt-[48px] lg:pl-[240px]">
        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}
