import React, { useState } from 'react';
import { Box, useInput, useApp } from 'ink';
import type { AnalysisResult } from '../core/types.js';
import Header, { TABS, type TabName } from './components/Header.js';
import OverviewScreen from './screens/OverviewScreen.js';
import ClusterList from './components/ClusterList.js';
import ClusterDetail from './components/ClusterDetail.js';
import RankingTable from './components/RankingTable.js';
import VisionList from './components/VisionList.js';

interface AppProps {
  data: AnalysisResult;
}

export default function App({ data }: AppProps) {
  const { exit } = useApp();
  const [tabIndex, setTabIndex] = useState(0);
  const [clusterSelected, setClusterSelected] = useState(0);
  const [clusterDetail, setClusterDetail] = useState<number | null>(null);

  const activeTab: TabName = TABS[tabIndex];

  // Build PR title map for ranking table
  const prTitles = new Map<number, string>();
  for (const cluster of data.duplicateClusters) {
    for (const item of cluster.items) {
      if (item.type === 'pr') prTitles.set(item.number, item.title);
    }
  }
  for (const v of data.visionAlignments) {
    if (v.type === 'pr') prTitles.set(v.number, v.title);
  }

  useInput((input, key) => {
    if (input === 'q') { exit(); return; }
    if (clusterDetail !== null) return; // detail handles its own input
    if (key.leftArrow) setTabIndex(Math.max(0, tabIndex - 1));
    if (key.rightArrow) setTabIndex(Math.min(TABS.length - 1, tabIndex + 1));
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header repo={data.repo} activeTab={activeTab} />
      <Box marginTop={1}>
        {activeTab === 'Overview' && <OverviewScreen data={data} />}
        {activeTab === 'Duplicates' && clusterDetail === null && (
          <ClusterList
            clusters={data.duplicateClusters}
            selectedIndex={clusterSelected}
            onSelect={setClusterSelected}
            onEnter={(i) => setClusterDetail(i)}
          />
        )}
        {activeTab === 'Duplicates' && clusterDetail !== null && (
          <ClusterDetail
            cluster={data.duplicateClusters[clusterDetail]}
            rankings={data.prRankings}
            onBack={() => setClusterDetail(null)}
          />
        )}
        {activeTab === 'Rankings' && (
          <RankingTable rankings={data.prRankings} prTitles={prTitles} />
        )}
        {activeTab === 'Vision' && (
          <VisionList alignments={data.visionAlignments} />
        )}
      </Box>
    </Box>
  );
}
