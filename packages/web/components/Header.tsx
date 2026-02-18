'use client';

import { useAnalysis } from '@/lib/context';
import { Menu } from 'lucide-react';

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { data } = useAnalysis();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b bg-card flex items-center px-4 gap-4">
      <button onClick={onMenuToggle} className="lg:hidden text-muted-foreground hover:text-foreground">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight">PR PILOT</span>
      </div>
      {data && (
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span className="font-mono">{data.repo}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{new Date(data.analyzedAt).toLocaleString()}</span>
        </div>
      )}
    </header>
  );
}
