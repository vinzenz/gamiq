#!/usr/bin/env node
/**
 * Builds every game in games/ into dist/<game>/ and generates the landing page
 * at dist/index.html. Used locally and by the GitHub Pages workflow.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gamesDir = join(root, 'games')
const distDir = join(root, 'dist')

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
        <div class="emoji" aria-hidden="true">${escapeHtml(game.emoji)}</div>
        <h2>${escapeHtml(game.title)}</h2>
        <p>${escapeHtml(game.description)}</p>
      </a>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0e14" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>" />
    <title>Gamiq — little games for phones and tablets</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100dvh;
        background: #0b0e14;
        color: #e6e9f2;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: clamp(24px, 6vw, 64px) 20px;
      }
      header { text-align: center; margin-bottom: 32px; }
      header h1 { margin: 0 0 8px; font-size: clamp(28px, 6vw, 40px); }
      header p { margin: 0; color: rgb(230 233 242 / 0.6); }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
        width: 100%;
        max-width: 900px;
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 20px;
        border: 1px solid rgb(255 255 255 / 0.1);
        border-radius: 16px;
        background: rgb(255 255 255 / 0.03);
        color: inherit;
        text-decoration: none;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .card:hover, .card:focus-visible {
        border-color: rgb(94 234 148 / 0.6);
        background: rgb(94 234 148 / 0.06);
      }
      .emoji { font-size: 32px; }
      .card h2 { margin: 0; font-size: 20px; }
      .card p { margin: 0; color: rgb(230 233 242 / 0.6); font-size: 14px; line-height: 1.45; }
    </style>
  </head>
  <body>
    <header>
      <h1>🎮 Gamiq</h1>
      <p>Little games for phones and tablets. Pick one:</p>
    </header>
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
writeFileSync(join(distDir, 'index.html'), landingHtml(games))
// GitHub Pages must serve raw files without Jekyll processing.
writeFileSync(join(distDir, '.nojekyll'), '')

console.log(`\n✓ built ${games.length} game(s) into dist/ (base: ${basePath})`)
