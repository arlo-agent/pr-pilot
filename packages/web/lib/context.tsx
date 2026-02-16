'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisResult } from '@/lib/types';

interface AnalysisContextValue {
  data: AnalysisResult | null;
  setData: (data: AnalysisResult) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalysisResult | null>(null);
  return (
    <AnalysisContext.Provider value={{ data, setData }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}
