import React from 'react';
import { Box, Text } from 'ink';

const TABS = ['Overview', 'Duplicates', 'Rankings', 'Vision'] as const;
export type TabName = (typeof TABS)[number];

interface HeaderProps {
  repo: string;
  activeTab: TabName;
}

export default function Header({ repo, activeTab }: HeaderProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">PR Pilot 🛩️</Text>
        <Text dimColor> — </Text>
        <Text color="white">{repo}</Text>
      </Box>
      <Box gap={1} marginTop={1}>
        {TABS.map((tab) => (
          <Box key={tab}>
            {tab === activeTab ? (
              <Text bold inverse color="cyan">{` ${tab} `}</Text>
            ) : (
              <Text dimColor>{` ${tab} `}</Text>
            )}
          </Box>
        ))}
        <Text dimColor> ←/→ switch tabs</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(60)}</Text>
      </Box>
    </Box>
  );
}

export { TABS };
