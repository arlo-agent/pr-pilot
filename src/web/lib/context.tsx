'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisResult } from './types';

interface AnalysisContextType {
  data: AnalysisResult | null;
  setData: (data: AnalysisResult | null) => void;
}

const AnalysisContext = createContext<AnalysisContextType>({ data: null, setData: () => {} });

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalysisResult | null>(null);
  return (
    <AnalysisContext.Provider value={{ data, setData }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
