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
import { DEFAULT_CONFIG, analyze, loadState, getStateStatus } from '@pr-pilot/core';

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
    const result = await analyze(config, {
      fresh: !!fresh,
      batchSize,
      pauseBetweenPhases: shouldPause,
      onPause: async (phase, done, total) => {
        console.log(`\n\n📊 Progress: ${done} of ${total} items (${phase})`);
        console.log('   State saved to .pr-pilot-state.json\n');
        const answer = await ask('   [c]ontinue / [s]tatus / [q]uit? ');
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

    // Clear progress line
    process.stdout.write('\n');

    console.log(`\n✅ Analysis complete!`);
    console.log(`  PRs: ${result.totalPRs}, Issues: ${result.totalIssues}`);
    console.log(`  Duplicate clusters: ${result.duplicateClusters.length}`);
    console.log(`  Vision alignments: ${result.visionAlignments.length}`);
    console.log(`  State saved to .pr-pilot-state.json\n`);

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
  .command('demo')
  .description('Launch TUI with mock data')
  .action(() => {
    render(React.createElement(App, { data: mockData }));
  });

program.parse();
