import React from 'react';
import { Box, Text } from 'ink';
import type { AnalysisResult } from '@pr-pilot/core';

interface OverviewScreenProps {
  data: AnalysisResult;
}

export default function OverviewScreen({ data }: OverviewScreenProps) {
  const totalItems = data.totalPRs + data.totalIssues;
  const dupItems = data.duplicateClusters.reduce((s, c) => s + c.items.length, 0);
  const misaligned = data.visionAlignments.filter((v) => v.alignment === 'misaligned');
  const aligned = data.visionAlignments.filter((v) => v.alignment === 'aligned');
  const avgScore = data.prRankings.length
    ? data.prRankings.reduce((s, r) => s + r.overallScore, 0) / data.prRankings.length
    : 0;

  // Health: penalize duplicates and misalignment
  const dupPenalty = Math.min(dupItems / totalItems, 0.5);
  const misPenalty = Math.min(misaligned.length / Math.max(data.visionAlignments.length, 1), 0.5);
  const health = Math.max(0, avgScore - dupPenalty * 0.3 - misPenalty * 0.3);
  const healthColor = health > 0.7 ? 'green' : health > 0.4 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Overview</Text>

      <Box gap={4}>
        <Box flexDirection="column">
          <Text dimColor>PRs Analyzed</Text>
          <Text bold color="cyan">{data.totalPRs}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Issues Analyzed</Text>
          <Text bold color="cyan">{data.totalIssues}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Duplicate Clusters</Text>
          <Text bold color={data.duplicateClusters.length > 0 ? 'yellow' : 'green'}>{data.duplicateClusters.length}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Health Score</Text>
          <Text bold color={healthColor}>{(health * 100).toFixed(0)}%</Text>
        </Box>
      </Box>

      {misaligned.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="red">⚠ Misaligned Items</Text>
          {misaligned.map((m) => (
            <Text key={m.number} color="red">  • #{m.number} {m.title}</Text>
          ))}
        </Box>
      )}

      {aligned.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="green">✓ Top Aligned</Text>
          {aligned.slice(0, 3).map((a) => (
            <Text key={a.number} color="green">  • #{a.number} {a.title} ({(a.score * 100).toFixed(0)}%)</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>{data.summary}</Text>
      </Box>
    </Box>
  );
}
