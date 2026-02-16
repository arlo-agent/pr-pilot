# PR Pilot

AI-powered GitHub PR & Issue triage. Finds duplicates, ranks PRs by quality, and checks alignment with your project vision.

## Monorepo Structure

This is a **pnpm workspace monorepo** with three packages:

```
packages/
  core/   — @pr-pilot/core   — Core engine: types, analysis, embeddings, similarity, ranking, vision
  cli/    — @pr-pilot/cli    — CLI entry point + Ink TUI (depends on core)
  web/    — @pr-pilot/web    — Next.js dashboard (depends on core)
```

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`npm install -g pnpm`)

## Quick Start

```bash
# Install all dependencies
pnpm install

# Build all packages (core first, then cli + web in parallel)
pnpm build

# Set up tokens
cp .env.example .env
# Add GITHUB_TOKEN and OPENAI_API_KEY to .env

# Run the CLI
pnpm dev:cli -- scan owner/repo

# Run the web dashboard
pnpm dev:web
```

## What It Does

Point it at a GitHub repo and PR Pilot will:

1. **Fetch** all open PRs and issues via the GitHub API
2. **Embed** each item using OpenAI embeddings (`text-embedding-3-small`)
3. **Cluster duplicates** — cosine similarity + union-find to group related items
4. **Rank PRs** across 7 quality signals (code quality, description, author reputation, review status, test coverage, recency, activity)
5. **Check vision alignment** — compares every PR/issue against your `VISION.md` (or any doc) using an LLM
6. **Summarize** — generates actionable recommendations

Results display in a terminal TUI (built with [Ink](https://github.com/vadimdemedes/ink)) or as JSON for the web dashboard.

## Working with Packages

```bash
# Build just core
pnpm --filter @pr-pilot/core build

# Run CLI in dev mode
pnpm --filter @pr-pilot/cli dev -- scan owner/repo

# Run web dev server
pnpm --filter @pr-pilot/web dev

# Run tests
pnpm test

# Clean all build artifacts
pnpm clean
```

## Package Details

### `@pr-pilot/core`
The shared engine. Exports all types and the main `analyze()` function plus individual modules (embeddings, similarity, ranker, vision, github).

### `@pr-pilot/cli`
CLI binary (`pr-pilot`) with two commands:
- `pr-pilot scan <owner/repo>` — run full analysis
- `pr-pilot demo` — launch TUI with mock data

Loads `.env` via `dotenv/config`.

### `@pr-pilot/web`
Next.js 14 dashboard with Tailwind CSS. Paste JSON output from `pr-pilot scan --json` to visualize results.

## License

MIT
