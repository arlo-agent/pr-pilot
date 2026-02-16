# PR Pilot

AI-powered GitHub PR & Issue triage. Finds duplicates, ranks PRs by quality, and checks alignment with your project vision.

## What It Does

Point it at a GitHub repo and PR Pilot will:

1. **Fetch** all open PRs and issues via the GitHub API
2. **Embed** each item using OpenAI embeddings (`text-embedding-3-small`)
3. **Cluster duplicates** — cosine similarity + union-find to group related items
4. **Rank PRs** across 7 quality signals (code quality, description, author reputation, review status, test coverage, recency, activity)
5. **Check vision alignment** — compares every PR/issue against your `VISION.md` (or any doc) using an LLM
6. **Summarize** — generates actionable recommendations

Results display in a terminal TUI (built with [Ink](https://github.com/vadimdemedes/ink)) or as JSON for the web dashboard.

## Quick Start

```bash
# Install
npm install
npm run build

# Set up tokens (copy and edit .env)
cp .env.example .env
# Then add your GITHUB_TOKEN and OPENAI_API_KEY to .env

# Or use environment variables directly
export GITHUB_TOKEN=ghp_...
export OPENAI_API_KEY=sk-...

# Run against a repo
pr-pilot scan owner/repo

# With vision alignment
pr-pilot scan owner/repo --vision VISION.md

# JSON output (for web dashboard or piping)
pr-pilot scan owner/repo --json

# Demo mode (mock data, no API keys needed)
pr-pilot demo
```

## CLI Options

```
pr-pilot scan <repo>

Arguments:
  repo                    Repository in owner/repo format

Options:
  --vision <path>         Path to vision document for alignment scoring
  --json                  Output JSON instead of TUI
  --threshold <number>    Cosine similarity threshold for duplicates (default: 0.85)
  --token <token>         GitHub token (or GITHUB_TOKEN env)
  --openai-key <key>      OpenAI API key (or OPENAI_API_KEY env)
  --max-items <n>         Maximum items to process (default: 500)
  --include-closed <days> Include items closed within N days (default: 0 = open only)
```

## Architecture

```
src/
├── cli.ts                 # Entry point — Commander CLI + Ink renderer
├── core/
│   ├── types.ts           # All TypeScript interfaces and config defaults
│   ├── github.ts          # Octokit-based GitHub fetching (PRs, issues, files, vision doc)
│   ├── embeddings.ts      # OpenAI embedding generation with local file cache
│   ├── similarity.ts      # Cosine similarity + union-find duplicate clustering
│   ├── ranker.ts          # 7-signal weighted PR quality scoring
│   ├── vision.ts          # LLM-based vision alignment classification
│   └── analyzer.ts        # Orchestrator — runs the full pipeline
├── tui/
│   ├── app.tsx            # Main Ink app with tab navigation
│   ├── components/        # Header, ClusterList, ClusterDetail, RankingTable, VisionList
│   ├── screens/           # OverviewScreen
│   └── mock-data.ts       # Demo dataset
└── web/                   # Next.js dashboard (paste JSON to explore results)
    └── app/
        ├── page.tsx       # JSON paste landing page
        └── dashboard/     # Interactive dashboard views
```

### Pipeline Flow

```
GitHub API → Embeddings → Similarity Pairs → Clusters → PR Ranking → Vision Check → Summary
```

### Quality Signals

Each PR is scored 0–1 on seven dimensions, then combined with weighted average:

| Signal | Weight | What It Measures |
|--------|--------|-----------------|
| Code Quality | 20% | Balanced diffs, reasonable size |
| Review Status | 20% | Approved > review required > changes requested |
| Description | 15% | Length, linked issues, markdown structure |
| Author Reputation | 15% | Owner > member > collaborator > first-timer |
| Test Coverage | 15% | Whether changed files include test files |
| Activity | 10% | Comments and review discussion |
| Recency | 5% | How recently the PR was created |

### Embedding Cache

Embeddings are cached in `.pr-pilot-cache.json` (keyed by SHA-256 of content). Unchanged items skip the OpenAI API on re-runs.

### Vision Alignment

Items are classified as **aligned**, **tangential**, or **misaligned** with a 0–1 score. PR Pilot looks for `VISION.md` or `README.md` in the repo by default, or you can specify a custom path with `--vision`.

## Web Dashboard

The Next.js dashboard at `src/web/` consumes the JSON output:

```bash
# Generate JSON
pr-pilot scan owner/repo --json > analysis.json

# Start dashboard
cd src/web && npm run dev
```

Paste the JSON on the landing page to explore clusters, rankings, and vision alignment interactively.

## TUI Navigation

- **←/→** — Switch tabs (Overview, Duplicates, Rankings, Vision)
- **↑/↓** — Navigate lists
- **Enter** — Drill into cluster detail
- **q** — Quit

## Requirements

- Node.js 18+
- GitHub personal access token (repo read scope)
- OpenAI API key (for embeddings + vision alignment)

## Development

```bash
npm run dev -- scan owner/repo     # Run without building (via tsx)
npm run build                       # Compile TypeScript
npm test                            # Run tests (vitest)
npm run lint                        # ESLint
```

## License

MIT
