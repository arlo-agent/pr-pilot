#!/usr/bin/env node
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

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
import { DEFAULT_CONFIG, analyze } from '@pr-pilot/core';

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
  .action(async (repo: string, opts: Record<string, unknown>) => {
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

    console.log(`Analyzing ${repo}...`);
    const result = await analyze(config);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    render(React.createElement(App, { data: result }));
  });

program
  .command('demo')
  .description('Launch TUI with mock data')
  .action(() => {
    render(React.createElement(App, { data: mockData }));
  });

program.parse();
