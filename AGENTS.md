# Gamiq — repo conventions

Mobile-first browser games monorepo: TypeScript + Vite + pnpm workspaces, deployed to GitHub
Pages (https://vinzenz.github.io/gamiq/) by `.github/workflows/deploy.yml` on push to `main`.

## Commands

- `pnpm check` — typecheck all packages (run after every change)
- `pnpm lint` / `pnpm format` — Biome
- `pnpm build` — build all games + landing page into `dist/`
- `pnpm preview` — serve `dist/` on the LAN for phone/tablet testing
- `pnpm new-game <slug> ["Title"]` — scaffold a new game from `games/tap-rush`

## Conventions

- One Vite app per game in `games/<slug>/`; the slug is the URL path (`/gamiq/<slug>/`).
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
