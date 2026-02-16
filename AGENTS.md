# AGENTS.md — PR Pilot Development Guidelines

## Project Structure

This is a pnpm monorepo with three packages:

```
packages/core/   — @pr-pilot/core (engine: types, GitHub API, embeddings, similarity, ranking, vision)
packages/cli/    — @pr-pilot/cli (CLI entry + TUI, depends on core)
packages/web/    — @pr-pilot/web (Next.js 16 dashboard, depends on core)
```

## Build & Test

```bash
pnpm install          # Install all deps
pnpm clean            # Remove dist/, .next/, tsbuildinfo
pnpm build            # Build all packages (core → cli → web)
pnpm test             # Run tests
```

**Always verify your work builds clean before committing:**
```bash
pnpm clean && pnpm build
```

If tests exist, run them too:
```bash
pnpm test
```

## Code Standards

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **ESM only** — `"type": "module"` everywhere, use `.js` extensions in imports
- **Module resolution** — `Node16` in tsconfig (not `bundler`)
- **CLI uses `tsc --build`** — follows project references to auto-build core

## Workflow

1. **Read before writing** — Understand the existing code before changing it. Check types.ts for data structures, analyzer.ts for the pipeline.
2. **Don't break the build** — Run `pnpm clean && pnpm build` before committing. Fix all errors.
3. **Write tests** — New features should have tests. Tests live in `packages/*/tests/` or `packages/*/src/**/*.test.ts`. Use Vitest.
4. **Small, focused commits** — One logical change per commit. Use conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
5. **Push to main** — Unless told otherwise, commit and push directly to main.

## Architecture Notes

- **Core is the shared engine** — CLI and Web both depend on it. Never import from cli/web into core.
- **State persistence** — `.pr-pilot-state.json` stores analysis progress for resume. `.pr-pilot-cache.json` caches embeddings by content hash.
- **Batch processing** — Embeddings and vision checks run in batches with rate limit retry (exponential backoff).
- **Web loads data** — via pasted JSON or from the state file via API route.

## Testing Guidelines

- Test core logic: similarity scoring, clustering (union-find), PR ranking signals, state management
- Mock external APIs (OpenAI, GitHub) — don't make real API calls in tests
- Test edge cases: empty repos, single item, rate limit errors, corrupt state files
- TUI/Web components: snapshot tests or basic render tests

## Common Pitfalls

- **Stale tsbuildinfo** — If types aren't found, run `pnpm clean` first
- **Missing .d.ts** — Core must build before CLI. `tsc --build` in CLI handles this.
- **Rate limits** — OpenAI embedding calls should use batch processing with delays
- **.env loading** — CLI loads from monorepo root or `packages/cli/`. Web doesn't need API tokens.
