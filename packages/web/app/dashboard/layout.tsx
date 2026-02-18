'use client';

import { useAnalysis } from '@/lib/context';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data } = useAnalysis();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!data) router.replace('/');
  }, [data, router]);

  if (!data) return null;

  return (
    <div className="min-h-screen">
      <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="pt-12 lg:pl-56">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
