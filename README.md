# 🎮 Gamiq

Small browser games for phones and tablets. Each game lives in `games/`, builds with Vite, and
everything deploys automatically to GitHub Pages on every push to `main`.

**Play:** https://vinzenz.github.io/gamiq/

## Layout

```
├── games/<slug>/        one self-contained Vite app per game (slug = URL path)
├── packages/shared/     @gamiq/shared — shared mobile-game toolkit
├── scripts/             build / preview / scaffolding scripts
└── .github/workflows/   GitHub Pages deployment
```

## Getting started

Requires Node 24 (see `.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm -C games/tap-rush dev     # run one game; prints a LAN URL for testing on a tablet
pnpm build                     # build all games + landing page into dist/
pnpm preview                   # serve dist/ on your LAN
```

## Creating a game

```sh
pnpm new-game brick-breaker "Brick Breaker"
```

Copies `games/tap-rush` (the demo/template) to `games/brick-breaker`, renames everything, and
prints the next steps. The landing page picks the game up automatically — set `title`, `emoji`,
and `description` in the game's `package.json` to control its card.

## Quality checks

```sh
pnpm check    # typecheck everything (TypeScript, strict)
pnpm lint     # Biome lint
pnpm format   # Biome format (writes)
```

## Deployment

`push` to `main` → GitHub Actions builds everything and deploys to
https://vinzenz.github.io/gamiq/ — each game ends up at `/gamiq/<slug>/`. No manual steps.
Set `BASE_PATH` to override the base path (e.g. for a custom domain).

## Shared toolkit (`@gamiq/shared`)

| Helper | Purpose |
| --- | --- |
| `setupViewport()` | locks viewport meta, blocks scroll/zoom/long-press |
| `onViewportResize()` | resize subscription (visualViewport-aware) |
| `resizeCanvasToDisplaySize()` / `applyCanvasScale()` | crisp DPR-aware canvas sizing |
| `trackPointers()` | unified touch/mouse/pen input with capture |
| `createLoop()` | rAF loop with clamped dt and auto-pause when hidden |
| `tone()` / `unlockAudio()` | tiny WebAudio sfx, gesture-unlocked for mobile |
| `loadBest()` / `updateBest()` | localStorage best-score helpers |
| `toggleFullscreen()`, `lockOrientation()`, `requestWakeLock()` | screen helpers |
