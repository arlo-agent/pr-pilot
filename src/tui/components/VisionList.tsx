import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { VisionAlignment } from '../../core/types.js';

interface VisionListProps {
  alignments: VisionAlignment[];
}

const ALIGN_COLOR = { aligned: 'green', tangential: 'yellow', misaligned: 'red' } as const;
const ALIGN_ICON = { aligned: '●', tangential: '◐', misaligned: '○' } as const;

export default function VisionList({ alignments }: VisionListProps) {
  const [selected, setSelected] = useState(0);
  const sorted = [...alignments].sort((a, b) => b.score - a.score);

  useInput((_input, key) => {
    if (key.upArrow && selected > 0) setSelected(selected - 1);
    if (key.downArrow && selected < sorted.length - 1) setSelected(selected + 1);
  });

  if (sorted.length === 0) {
    return <Text dimColor>No vision alignments available. Use --vision to enable.</Text>;
  }

  const current = sorted[selected];

  return (
    <Box flexDirection="column">
      <Text bold>Vision Alignment</Text>
      <Text dimColor>↑/↓ navigate to see reasoning</Text>
      <Box flexDirection="column" marginTop={1}>
        {sorted.map((a, i) => (
          <Box key={a.number}>
            <Text inverse={i === selected} color={ALIGN_COLOR[a.alignment]}>
              {i === selected ? '▸ ' : '  '}
              {ALIGN_ICON[a.alignment]} #{a.number} {a.type.toUpperCase()} {a.title.slice(0, 45)}
              {' '}({(a.score * 100).toFixed(0)}%)
            </Text>
          </Box>
        ))}
      </Box>
      {current && (
        <Box flexDirection="column" marginTop={1} paddingLeft={2} borderStyle="single" borderColor={ALIGN_COLOR[current.alignment]}>
          <Text bold color={ALIGN_COLOR[current.alignment]}>
            #{current.number} — {current.alignment.toUpperCase()}
          </Text>
          <Text>{current.reasoning}</Text>
          {current.relevantVisionSection && (
            <Text dimColor>Section: {current.relevantVisionSection}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
