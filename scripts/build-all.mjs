#!/usr/bin/env node
/**
 * Builds every game in games/ into dist/<game>/ and generates the landing page
 * at dist/index.html. Used locally and by the GitHub Pages workflow.
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gamesDir = join(root, 'games')
const distDir = join(root, 'dist')
const landingHero = join(root, 'assets', 'landing', 'gamiq-hero.webp')

// On GitHub Pages a project site is served from /<repo>/ — keep it overridable
// for custom domains or local verification via BASE_PATH=/.
const repoName = (process.env.GITHUB_REPOSITORY ?? '').split('/')[1] ?? 'gamiq'
const basePath = process.env.BASE_PATH ?? `/${repoName}/`

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function discoverGames() {
  return readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .filter((entry) => existsSync(join(gamesDir, entry.name, 'package.json')))
    .map((entry) => {
      const pkg = JSON.parse(readFileSync(join(gamesDir, entry.name, 'package.json'), 'utf8'))
      return {
        dir: entry.name,
        title: pkg.title ?? entry.name,
        description: pkg.description ?? '',
        emoji: pkg.emoji ?? '🎮',
      }
    })
}

function buildGame(game) {
  console.log(`▸ building ${game.title} (games/${game.dir})`)
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vite',
      'build',
      '--base',
      `${basePath}${game.dir}/`,
      '--outDir',
      `../../dist/${game.dir}`,
      '--emptyOutDir',
    ],
    { cwd: join(gamesDir, game.dir), stdio: 'inherit' },
  )
  if (result.error ?? result.status !== 0) {
    process.exitCode = result.status ?? 1
    throw new Error(`Build failed for games/${game.dir}`)
  }
}

function landingHtml(games) {
  const cards = games
    .map(
      (game) => `      <a class="card" href="${game.dir}/">
        <div class="card-top">
          <div class="emoji" aria-hidden="true">${escapeHtml(game.emoji)}</div>
          <span class="play">Play now <span aria-hidden="true">→</span></span>
        </div>
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p>${escapeHtml(game.description)}</p>
        </div>
      </a>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#101c42" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>" />
    <title>Gamiq — little games for phones and tablets</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      html { background: #090d1b; }
      body {
        margin: 0;
        min-height: 100dvh;
        background:
          radial-gradient(circle at 20% 45%, rgb(92 53 143 / 0.2), transparent 35%),
          radial-gradient(circle at 82% 62%, rgb(26 137 182 / 0.16), transparent 32%),
          #090d1b;
        color: #e6e9f2;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 18px max(32px, env(safe-area-inset-bottom));
      }
      .hero {
        position: relative;
        display: grid;
        place-items: center;
        width: min(1120px, calc(100% + 36px));
        min-height: clamp(260px, 46vw, 440px);
        margin-bottom: -34px;
        overflow: hidden;
        isolation: isolate;
        background: #101c42 url('gamiq-hero.webp') center / cover no-repeat;
        text-align: center;
      }
      .hero::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          radial-gradient(circle, rgb(5 12 31 / 0.04) 5%, rgb(5 12 31 / 0.46) 68%),
          linear-gradient(180deg, rgb(5 12 31 / 0.02) 55%, #090d1b 100%);
      }
      header { max-width: 620px; padding: 34px 24px 74px; filter: drop-shadow(0 4px 14px rgb(1 4 15 / 0.85)); }
      .eyebrow { margin: 0 0 10px; color: #ffd66b; font-size: 11px; font-weight: 850; letter-spacing: .2em; text-transform: uppercase; }
      header h1 { margin: 0; font-size: clamp(48px, 10vw, 82px); line-height: .95; letter-spacing: -.05em; }
      header h1 span { color: #ffcb52; }
      header p { margin: 14px auto 0; max-width: 460px; color: rgb(244 247 255 / 0.84); font-size: clamp(15px, 2.4vw, 18px); line-height: 1.5; }
      .grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        gap: 18px;
        width: 100%;
        max-width: 980px;
      }
      .card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 22px;
        min-height: 230px;
        padding: 22px;
        overflow: hidden;
        border: 1px solid rgb(166 183 234 / 0.2);
        border-radius: 24px;
        background:
          radial-gradient(circle at 88% 0%, rgb(95 111 221 / 0.2), transparent 42%),
          linear-gradient(150deg, rgb(28 34 63 / 0.96), rgb(15 20 39 / 0.98));
        box-shadow: 0 16px 44px rgb(0 0 0 / 0.28), inset 0 1px rgb(255 255 255 / 0.08);
        color: inherit;
        text-decoration: none;
        transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      }
      .card:hover, .card:focus-visible {
        transform: translateY(-4px);
        border-color: rgb(255 203 82 / 0.72);
        box-shadow: 0 22px 54px rgb(0 0 0 / 0.38), 0 0 0 4px rgb(255 203 82 / 0.08);
      }
      .card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .emoji {
        display: grid;
        place-items: center;
        width: 58px;
        height: 58px;
        border: 1px solid rgb(255 255 255 / 0.16);
        border-radius: 18px;
        background: rgb(255 255 255 / 0.08);
        box-shadow: inset 0 1px rgb(255 255 255 / 0.1);
        font-size: 32px;
      }
      .play { color: #ffd66b; font-size: 13px; font-weight: 750; }
      .card h2 { margin: 0 0 8px; font-size: 22px; letter-spacing: -.02em; }
      .card p { margin: 0; color: rgb(230 233 242 / 0.66); font-size: 14px; line-height: 1.5; }
      .card:nth-child(1) { background: radial-gradient(circle at 88% 0%, rgb(200 62 77 / 0.3), transparent 44%), linear-gradient(150deg, rgb(32 56 67 / 0.98), rgb(12 28 45 / 0.98)); }
      .card:nth-child(2) { background: radial-gradient(circle at 88% 0%, rgb(59 183 238 / 0.28), transparent 44%), linear-gradient(150deg, rgb(25 42 76 / 0.98), rgb(12 23 44 / 0.98)); }
      .card:nth-child(3) { background: radial-gradient(circle at 88% 0%, rgb(179 82 236 / 0.28), transparent 44%), linear-gradient(150deg, rgb(48 29 71 / 0.98), rgb(22 15 42 / 0.98)); }
      @media (max-width: 560px) {
        .hero { margin-bottom: -24px; }
        header { padding-bottom: 58px; }
        .card { min-height: 208px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .card { transition: none; }
      }
    </style>
  </head>
  <body>
    <section class="hero">
      <header>
        <p class="eyebrow">Pocket-sized play</p>
        <h1>Gam<span>iq</span></h1>
        <p>Quick games built for touch. Pick a world and start playing.</p>
      </header>
    </section>
    <main class="grid">
${cards}
    </main>
  </body>
</html>
`
}

const games = discoverGames()
if (games.length === 0) {
  console.error('No games found in games/ — create one with: pnpm new-game my-game')
  process.exit(1)
}

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
for (const game of games) buildGame(game)
copyFileSync(landingHero, join(distDir, 'gamiq-hero.webp'))
writeFileSync(join(distDir, 'index.html'), landingHtml(games))
// GitHub Pages must serve raw files without Jekyll processing.
writeFileSync(join(distDir, '.nojekyll'), '')

console.log(`\n✓ built ${games.length} game(s) into dist/ (base: ${basePath})`)
