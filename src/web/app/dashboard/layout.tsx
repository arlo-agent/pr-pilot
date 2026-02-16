'use client';

import { useAnalysis } from '@/lib/context';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data } = useAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (!data) router.replace('/');
  }, [data, router]);

  if (!data) return null;

  return (
    <div>
      <Navbar />
      <main className="p-6">{children}</main>
    </div>
  );
}
