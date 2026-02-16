# PR Pilot — AI-Powered GitHub PR & Issue Triage

## Problem
Large OSS projects (like OpenClaw with 3100+ PRs) get flooded with duplicate/overlapping PRs and Issues. Maintainers waste hours triaging manually.

## Features (MVP)

### 1. PR & Issue Deduplication
- Fetch all open PRs and Issues via GitHub API
- Embed titles + descriptions + diff summaries using embeddings
- Cluster similar items using cosine similarity
- Report duplicate groups with similarity scores

### 2. Best PR Detection
- Among duplicate/overlapping PRs, rank by quality signals:
  - Code quality (lint, test coverage, clean diff)
  - PR description quality
  - Author reputation (contributions, history)
  - Review status (approvals, comments)
  - Recency and activity
  - File overlap analysis (which PRs touch same files)
- LLM analysis for nuanced comparison

### 3. Vision Document Alignment
- Load a VISION.md (or similar) document from the repo
- Compare each PR's intent against the vision
- Score alignment (aligned / tangential / misaligned)
- Flag PRs that stray too far with explanation

### 4. TUI (Terminal UI)
- Interactive terminal interface using Ink (React for CLI)
- Browse duplicate clusters
- View PR comparisons side-by-side
- Mark/reject PRs
- Filter by status, author, label

### 5. Web App
- Next.js dashboard
- Visualize duplicate clusters
- PR quality rankings
- Vision alignment scores
- Actionable: comment, label, close from the UI

## Tech Stack
- **Language:** TypeScript
- **GitHub API:** Octokit (REST + GraphQL)
- **Embeddings:** OpenAI text-embedding-3-small (cost-effective)
- **LLM:** OpenAI/Anthropic for deeper analysis
- **TUI:** Ink (React for terminals)
- **Web:** Next.js + Tailwind
- **Testing:** Vitest
- **Package:** CLI via npm

## Architecture

```
┌─────────────────┐
│   GitHub API     │
│  (Octokit)       │
└────────┬────────┘
         │
┌────────▼────────┐
│   Data Layer     │
│  Fetch PRs/Issues│
│  Cache locally   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Analysis Engine │
│  - Embeddings    │
│  - Similarity    │
│  - LLM Analysis  │
│  - Vision Check  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐ ┌───▼──┐
│ TUI  │ │ Web  │
│(Ink) │ │(Next)│
└──────┘ └──────┘
```

## File Structure
```
pr-pilot/
├── src/
│   ├── core/
│   │   ├── github.ts          # GitHub API client
│   │   ├── embeddings.ts      # Embedding generation
│   │   ├── similarity.ts      # Cosine similarity & clustering
│   │   ├── analyzer.ts        # LLM-based analysis
│   │   ├── vision.ts          # Vision document alignment
│   │   ├── ranker.ts          # PR quality ranking
│   │   └── types.ts           # Shared types
│   ├── tui/
│   │   ├── app.tsx            # Ink app entry
│   │   ├── components/        # TUI components
│   │   └── screens/           # TUI screens
│   ├── web/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   └── api/               # API routes
│   └── cli.ts                 # CLI entry point
├── tests/
│   ├── similarity.test.ts
│   ├── analyzer.test.ts
│   ├── vision.test.ts
│   ├── ranker.test.ts
│   └── github.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```
