'use client';

import { AnalysisProvider } from '@/lib/context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AnalysisProvider>{children}</AnalysisProvider>;
}
