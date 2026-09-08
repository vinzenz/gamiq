# Gamiq — repo conventions

Mobile-first browser games monorepo: TypeScript + Vite + pnpm workspaces, deployed to GitHub
Pages (https://vinzenz.github.io/gamiq/) by `.github/workflows/deploy.yml` on push to `main`.

## Commands

- `pnpm check` — typecheck all packages (run after every change)
- `pnpm lint` / `pnpm format` — Biome
- `pnpm build` — build all games + landing page into `dist/`
- `pnpm preview` — serve `dist/` on the LAN for phone/tablet testing
- `pnpm new-game <slug> ["Title"]` — scaffold a new game from `games/tap-rush`
- `docs/assets.md` — recommendations for building game assets with imagegen

## Conventions

- One Vite app per game in `games/<slug>/`; the slug is the URL path (`/gamiq/<slug>/`).
- Prefer logically split commits (engine/screens/levels/assets); agents never commit or push
  unless the user asks; a bar on committing (e.g. during multi-agent builds) is a policy
  decision to state in the launch plan, not to make silently. Multi-agent builds default to
  committing **between waves** — one commit per completed wave, split per ticket where file
  scopes allow — so changes stay small and reviewable (never mid-wave: concurrent git runs
  race the index lock and capture sibling WIP).
- Game art is generated with the `imagegen` tool — follow `docs/assets.md` (style blocks,
  transparent sprites, WebP + 2× sizing budgets, per-game `ASSETS.md`).
- `games/tap-rush` is both the demo game and the scaffold template — keep it working.
- Keep games dependency-light; use `@gamiq/shared` (viewport, pointer input, loop, audio,
  storage, screen helpers) instead of ad-hoc implementations.
- Set `title`, `emoji`, `description` in each game's `package.json` — the landing page is
  generated from them.
- Mobile constraints: design for touch only (no hover), respect safe-area insets, audio must
  be unlocked on first user gesture, call `setupViewport()` at startup, support any
  orientation.
- Node 24 (`.nvmrc`), pnpm 11, `engineStrict` is on. Latest stable versions of deps and
  GitHub Actions are preferred.

## Agent skills

### Issue tracker

Issues and specs live in Rohrpost (`.rohrpost/`, git-native; `rp` CLI, display prefix `GQ`).
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root `CONTEXT-MAP.md` pointing at per-context `CONTEXT.md` files under
`games/<slug>/` and `packages/`. See `docs/agents/domain.md`.
