'use client';

import { useAnalysis } from '@/lib/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Markdown from 'react-markdown';

export default function SummaryPage() {
  const { data } = useAnalysis();
  if (!data) return null;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Analysis Summary</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {data.repo} · {new Date(data.analyzedAt).toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-invert prose-sm max-w-none [&_a]:text-blue-400 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_code]:text-foreground [&_code]:bg-secondary [&_code]:px-1">
          <Markdown>{data.summary}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}
