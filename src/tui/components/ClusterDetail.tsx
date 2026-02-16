import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { DuplicateCluster, PRQualitySignals } from '../../core/types.js';

interface ClusterDetailProps {
  cluster: DuplicateCluster;
  rankings: PRQualitySignals[];
  onBack: () => void;
}

function scoreColor(v: number): string {
  if (v > 0.7) return 'green';
  if (v > 0.4) return 'yellow';
  return 'red';
}

export default function ClusterDetail({ cluster, rankings, onBack }: ClusterDetailProps) {
  useInput((_input, key) => {
    if (key.escape || key.backspace) onBack();
  });

  const rankMap = new Map(rankings.map((r) => [r.number, r]));

  return (
    <Box flexDirection="column">
      <Text bold>Cluster Detail</Text>
      <Text dimColor>Avg similarity: {(cluster.averageSimilarity * 100).toFixed(0)}% │ Esc to go back</Text>
      <Box flexDirection="column" marginTop={1}>
        {cluster.items.map((item) => {
          const isBest = item.number === cluster.bestItem;
          const rank = rankMap.get(item.number);
          return (
            <Box key={item.number} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color={isBest ? 'green' : 'white'}>
                  {isBest ? '⭐ ' : '   '}
                  <Text bold>#{item.number}</Text>
                  {' '}
                  <Text>{item.title}</Text>
                </Text>
              </Box>
              <Box paddingLeft={4}>
                <Text dimColor>
                  {item.type.toUpperCase()} │ similarity: {(item.similarity * 100).toFixed(0)}%
                </Text>
              </Box>
              {rank && (
                <Box paddingLeft={4} gap={1}>
                  <Text color={scoreColor(rank.codeQuality)}>Code:{rank.codeQuality.toFixed(2)}</Text>
                  <Text color={scoreColor(rank.descriptionQuality)}>Desc:{rank.descriptionQuality.toFixed(2)}</Text>
                  <Text color={scoreColor(rank.reviewStatus)}>Review:{rank.reviewStatus.toFixed(2)}</Text>
                  <Text color={scoreColor(rank.testCoverage)}>Tests:{rank.testCoverage.toFixed(2)}</Text>
                  <Text bold color={scoreColor(rank.overallScore)}>Score:{rank.overallScore.toFixed(2)}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
