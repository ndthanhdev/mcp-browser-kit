# AGENTS.md

MCP Browser Kit: an MCP server that lets AI assistants observe and control local browsers through a companion browser extension.

## Tech stack

- **Language:** TypeScript (ESM, `target` ES2024), strict project references
- **Runtime:** Node `^22.14.0`
- **Package manager:** Yarn `4.10.3` (Yarn Berry workspaces) — never use npm or pnpm
- **Monorepo orchestrator:** [moon](https://moonrepo.dev) (`moon run`, `moon check`)
- **Toolchain version manager:** proto (`.prototools`)
- **Lint/format:** Biome (not ESLint/Prettier)
- **Dependency consistency:** syncpack
- **Bundler:** tsup; **type emit:** `tsc --build`
- **Tests:** Playwright (extension E2E in `apps/ext-e2e`)
- **DI:** InversifyJS + `reflect-metadata`

## Commands

Run from the workspace root.

```bash
# Install
yarn install

# Full check across all projects (build + biome + syncpack) — mirrors CI
moon check --all

# Lint / format (Biome)
moon run scripts:biome-check        # check only

# Dependency consistency
moon run scripts:syncpack-lint
moon run scripts:syncpack-fix

# Build a project (e.g. server or an extension)
moon run server:build
moon run m3:build

# E2E tests (Playwright)
moon run ext-e2e:test

# MCP inspector against the built server
moon run server:mcp-inspector
```

CI runs via two workflows: `.github/workflows/pr-build.yml` (PRs, `moon ci`) and `.github/workflows/branch-push.yml` (push to `main`/`release/*`, `moon check --all`). Both build via Dagger then run sharded e2e tests. Make them pass before considering work done.

## Constraints

<!-- ### TBD -->