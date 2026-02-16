import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { DuplicateCluster } from '../../core/types.js';

interface ClusterListProps {
  clusters: DuplicateCluster[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onEnter: (index: number) => void;
}

export default function ClusterList({ clusters, selectedIndex, onSelect, onEnter }: ClusterListProps) {
  useInput((input, key) => {
    if (key.upArrow && selectedIndex > 0) onSelect(selectedIndex - 1);
    if (key.downArrow && selectedIndex < clusters.length - 1) onSelect(selectedIndex + 1);
    if (key.return) onEnter(selectedIndex);
  });

  if (clusters.length === 0) {
    return <Text color="green">✓ No duplicate clusters found!</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Duplicate Clusters ({clusters.length})</Text>
      <Text dimColor>↑/↓ navigate, Enter to inspect</Text>
      <Box flexDirection="column" marginTop={1}>
        {clusters.map((cluster, i) => {
          const isSelected = i === selectedIndex;
          const best = cluster.items.find((it) => it.number === cluster.bestItem);
          return (
            <Box key={cluster.id}>
              <Text inverse={isSelected} color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '▸ ' : '  '}
                <Text bold>{cluster.items.length} items</Text>
                {' │ '}
                <Text color="yellow">~{(cluster.averageSimilarity * 100).toFixed(0)}% similar</Text>
                {' │ '}
                {best ? (
                  <Text>⭐ #{best.number} {best.title.slice(0, 40)}</Text>
                ) : (
                  <Text dimColor>no best item</Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
