#!/usr/bin/env node
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createInterface } from 'readline';

// Load .env from package dir or monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, '../../..', '.env');
const localEnv = resolve(__dirname, '..', '.env');
dotenv.config({ path: existsSync(localEnv) ? localEnv : rootEnv });

import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import App from './tui/app.js';
import { mockData } from './tui/mock-data.js';
import type { PilotConfig } from '@pr-pilot/core';
import { DEFAULT_CONFIG, analyze, loadState, getStateStatus, generateSummary, findSimilarPairs, clusterDuplicates, rankPRs } from '@pr-pilot/core';

function buildResultFromState(state: ReturnType<typeof loadState>) {
  if (!state) return null;
  const relatedThreshold = DEFAULT_CONFIG.relatedThreshold ?? 0.7;
  const embedded = state.embeddedItems ?? [];
  const pairs = findSimilarPairs(embedded, relatedThreshold);
  const clusters = clusterDuplicates(pairs, embedded);
  const rankings = clusters.flatMap((c) => rankPRs(state.prs, c));
  return {
    repo: state.repo,
    analyzedAt: state.lastRunAt,
    totalPRs: state.prs.length,
    totalIssues: state.issues.length,
    duplicateClusters: clusters,
    prRankings: rankings,
    visionAlignments: state.visionAlignments ?? [],
    summary: '',
  };
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

const program = new Command();

program
  .name('pr-pilot')
  .description('AI-powered GitHub PR & Issue triage')
  .version('0.1.0');

program
  .command('scan')
  .description('Run full analysis on a repository')
  .argument('<repo>', 'Repository in owner/repo format')
  .option('--vision <path>', 'Path to vision document for alignment scoring')
  .option('--json', 'Output JSON instead of TUI')
  .option('--threshold <number>', 'Similarity threshold', parseFloat)
  .option('--token <token>', 'GitHub token (or GITHUB_TOKEN env)')
  .option('--openai-key <key>', 'OpenAI API key (or OPENAI_API_KEY env)')
  .option('--max-items <n>', 'Maximum items to process', parseInt)
  .option('--include-closed <days>', 'Include items closed within N days', parseInt)
  .option('--batch-size <n>', 'Items per embedding batch (default 50)', parseInt)
  .option('--continue', 'Continue from saved state (default if state exists)')
  .option('--fresh', 'Ignore saved state, start over')
  .option('--no-pause', 'Run all batches without pausing')
  .option('--no-summary', 'Skip LLM-generated summary')
  .option('--status', 'Print current analysis state without running')
  .action(async (repo: string, opts: Record<string, unknown>) => {
    // --status: just print state and exit
    if (opts.status) {
      const state = loadState();
      if (!state) {
        console.log('No saved state found. Run a scan first.');
      } else {
        console.log(getStateStatus(state));
      }
      return;
    }

    const config: PilotConfig = {
      githubToken: (opts.token as string) || process.env.GITHUB_TOKEN || '',
      openaiApiKey: (opts.openaiKey as string) || process.env.OPENAI_API_KEY || '',
      repo,
      duplicateThreshold: (opts.threshold as number) ?? DEFAULT_CONFIG.duplicateThreshold!,
      relatedThreshold: DEFAULT_CONFIG.relatedThreshold!,
      embeddingModel: DEFAULT_CONFIG.embeddingModel!,
      analysisModel: DEFAULT_CONFIG.analysisModel!,
      visionFile: (opts.vision as string) ?? null,
      maxItems: (opts.maxItems as number) ?? DEFAULT_CONFIG.maxItems!,
      includeClosedDays: (opts.includeClosed as number) ?? DEFAULT_CONFIG.includeClosedDays!,
    };

    if (!config.githubToken) {
      console.error('Error: GitHub token required (--token or GITHUB_TOKEN env)');
      process.exit(1);
    }
    if (!config.openaiApiKey) {
      console.error('Error: OpenAI API key required (--openai-key or OPENAI_API_KEY env)');
      process.exit(1);
    }

    const fresh = opts.fresh as boolean | undefined;
    const batchSize = (opts.batchSize as number) ?? 50;
    const shouldPause = opts.pause !== false; // --no-pause disables

    console.log(`Analyzing ${repo}...`);
    if (fresh) {
      console.log('Starting fresh (ignoring saved state)');
    } else {
      const existing = loadState();
      if (existing && existing.repo === repo) {
        const status = getStateStatus(existing);
        console.log(`Resuming from saved state:\n${status}`);
      }
    }
    console.log(`Batch size: ${batchSize}${shouldPause ? ' (will pause between phases)' : ' (no-pause mode)'}\n`);

    let lastPhase = '';
    let result;
    try {
    result = await analyze(config, {
      fresh: !!fresh,
      batchSize,
      pauseBetweenPhases: shouldPause,
      onWaveComplete: async (waveResult, wave, totalWaves) => {
        console.log(`\n\n  ✅ Wave ${wave}/${totalWaves} complete!`);
        console.log(`     Items processed: ${waveResult.prRankings.length > 0 ? waveResult.prRankings.length + ' ranked PRs' : 'no ranked PRs yet'}`);
        console.log(`     Duplicate clusters: ${waveResult.duplicateClusters.length}`);
        console.log(`     Vision alignments: ${waveResult.visionAlignments.length}`);
        if (waveResult.duplicateClusters.length > 0) {
          console.log(`     Top clusters:`);
          for (const c of waveResult.duplicateClusters.slice(0, 3)) {
            console.log(`       • ${c.items.length} items (similarity: ${c.averageSimilarity.toFixed(2)}) — ${c.items.map(i => `#${i.number}`).join(', ')}`);
          }
        }
        console.log(`     State saved to .pr-pilot-state.json`);
      },
      onPause: async (phase, done, total) => {
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        console.log(`\n\n📊 Progress: ${done}/${total} items (${pct}%) — ${phase}`);
        console.log('   You can view partial results with: pr-pilot status\n');
        const answer = await ask('   [c]ontinue / [v]iew TUI / [j]son / [s]tatus / [q]uit? ');
        if (answer === 'q' || answer === 'quit') {
          console.log('\n👋 Stopped. Run again to resume from saved state.');
          process.exit(0);
        }
        if (answer === 's' || answer === 'status') {
          const state = loadState();
          if (state) console.log('\n' + getStateStatus(state) + '\n');
          const answer2 = await ask('   [c]ontinue / [q]uit? ');
          if (answer2 === 'q' || answer2 === 'quit') {
            console.log('\n👋 Stopped. Run again to resume from saved state.');
            process.exit(0);
          }
        }
        if (answer === 'j' || answer === 'json') {
          const state = loadState();
          if (state) {
            console.log(JSON.stringify({
              repo: state.repo,
              progress: state.progress,
              embeddedCount: state.embeddedItems?.length ?? 0,
              visionCount: state.visionAlignments?.length ?? 0,
            }, null, 2));
          }
          const answer2 = await ask('\n   [c]ontinue / [q]uit? ');
          if (answer2 === 'q' || answer2 === 'quit') {
            console.log('\n👋 Stopped. Run again to resume from saved state.');
            process.exit(0);
          }
        }
      },
      onProgress: (done, total, phase) => {
        if (phase !== lastPhase) {
          if (lastPhase) process.stdout.write('\n');
          lastPhase = phase;
        }
        if (total > 0) {
          const pct = Math.round((done / total) * 100);
          process.stdout.write(`\r  [${phase}] ${done}/${total} (${pct}%)`);
        } else {
          process.stdout.write(`\r  [${phase}]...`);
        }
      },
    });
    } catch (err: unknown) {
      const error = err as Error & { rateLimited?: boolean };
      console.log('\n');
      if (error.rateLimited) {
        console.log(`\n⚠️  Rate limited by OpenAI. Progress has been saved.`);
        const state = loadState();
        if (state) console.log(`   ${getStateStatus(state)}`);
        console.log(`\n   Run the same command again to resume from where you left off.`);
        console.log(`   Tip: try a smaller batch size: --batch-size 5\n`);
      } else {
        console.error(`\n❌ Error: ${error.message}`);
        const state = loadState();
        if (state) {
          console.log(`   Progress saved. Run again to resume.`);
        }
      }
      process.exit(1);
    }

    // Clear progress line
    process.stdout.write('\n');

    console.log(`\n✅ Analysis complete!`);
    console.log(`  PRs: ${result.totalPRs}, Issues: ${result.totalIssues}`);
    console.log(`  Duplicate clusters: ${result.duplicateClusters.length}`);
    console.log(`  Vision alignments: ${result.visionAlignments.length}`);
    console.log(`  State saved to .pr-pilot-state.json\n`);

    // Generate LLM summary unless --no-summary
    if (opts.summary !== false) {
      try {
        process.stdout.write('📝 Generating summary...');
        const summary = await generateSummary(result, config.openaiApiKey, config.analysisModel);
        result.summary = summary;
        process.stdout.write('\r');
        console.log('─'.repeat(60));
        console.log(summary);
        console.log('─'.repeat(60));
        console.log();
      } catch (err: unknown) {
        console.warn(`\n⚠️  Summary generation failed: ${(err as Error).message}\n`);
      }
    }

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    render(React.createElement(App, { data: result }));
  });

program
  .command('status')
  .description('Show current analysis state')
  .action(() => {
    const state = loadState();
    if (!state) {
      console.log('No saved state found. Run a scan first.');
      return;
    }
    console.log(getStateStatus(state));
  });

program
  .command('summarize')
  .description('Generate a summary from saved state without re-running analysis')
  .option('--openai-key <key>', 'OpenAI API key (or OPENAI_API_KEY env)')
  .option('--json', 'Output full result as JSON (including summary)')
  .action(async (opts: Record<string, unknown>) => {
    const state = loadState();
    if (!state) {
      console.log('No saved state found. Run a scan first.');
      process.exit(1);
    }

    const apiKey = (opts.openaiKey as string) || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      console.error('Error: OpenAI API key required (--openai-key or OPENAI_API_KEY env)');
      process.exit(1);
    }

    const result = buildResultFromState(state);
    if (!result) {
      console.log('Failed to build result from state.');
      process.exit(1);
    }

    console.log(getStateStatus(state));
    console.log();

    process.stdout.write('📝 Generating summary...');
    try {
      const summary = await generateSummary(result, apiKey, DEFAULT_CONFIG.analysisModel);
      result.summary = summary;
      process.stdout.write('\r');
      console.log('─'.repeat(60));
      console.log(summary);
      console.log('─'.repeat(60));

      if (opts.json) {
        console.log();
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err: unknown) {
      console.error(`\n❌ Summary generation failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Launch TUI with mock data')
  .action(() => {
    render(React.createElement(App, { data: mockData }));
  });

program.parse();
