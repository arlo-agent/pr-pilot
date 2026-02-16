import React from 'react';
import { Box, Text } from 'ink';
import type { PRQualitySignals } from '@pr-pilot/core';

interface RankingTableProps {
  rankings: PRQualitySignals[];
  prTitles: Map<number, string>;
}

function sc(v: number): string {
  if (v > 0.7) return 'green';
  if (v > 0.4) return 'yellow';
  return 'red';
}

function cell(v: number, w = 6): string {
  return v.toFixed(2).padStart(w);
}

export default function RankingTable({ rankings, prTitles }: RankingTableProps) {
  const sorted = [...rankings].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <Box flexDirection="column">
      <Text bold>PR Quality Rankings</Text>
      <Box marginTop={1}>
        <Text bold dimColor>
          {'  #'.padEnd(6)}{'Title'.padEnd(35)}{'Code'.padStart(6)}{'Desc'.padStart(6)}{'Auth'.padStart(6)}{'Revw'.padStart(6)}{'Test'.padStart(6)}{'Score'.padStart(7)}
        </Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(78)}</Text>
      </Box>
      {sorted.map((r) => {
        const title = (prTitles.get(r.number) ?? `PR #${r.number}`).slice(0, 32);
        return (
          <Box key={r.number}>
            <Text>
              <Text>{'#' + String(r.number).padEnd(5)}</Text>
              <Text>{title.padEnd(35)}</Text>
              <Text color={sc(r.codeQuality)}>{cell(r.codeQuality)}</Text>
              <Text color={sc(r.descriptionQuality)}>{cell(r.descriptionQuality)}</Text>
              <Text color={sc(r.authorReputation)}>{cell(r.authorReputation)}</Text>
              <Text color={sc(r.reviewStatus)}>{cell(r.reviewStatus)}</Text>
              <Text color={sc(r.testCoverage)}>{cell(r.testCoverage)}</Text>
              <Text bold color={sc(r.overallScore)}>{cell(r.overallScore, 7)}</Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
