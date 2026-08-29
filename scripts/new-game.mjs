#!/usr/bin/env node
/**
 * Scaffolds a new game from games/tap-rush (which doubles as the template):
 *   pnpm new-game brick-breaker "Brick Breaker"
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templateDir = join(root, 'games', 'tap-rush')

const slug = process.argv[2]
const title =
  process.argv[3] ??
  slug
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')

if (!slug || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: pnpm new-game <game-name> ["Display Title"]')
  console.error(
    '  game-name: lowercase letters/digits separated by single dashes, e.g. brick-breaker',
  )
  process.exit(1)
}
if (!existsSync(join(templateDir, 'package.json'))) {
  console.error(`Template games/tap-rush is missing — create games/${slug} manually instead.`)
  process.exit(1)
}

const targetDir = join(root, 'games', slug)
if (existsSync(targetDir)) {
  console.error(`games/${slug} already exists.`)
  process.exit(1)
}

mkdirSync(join(root, 'games'), { recursive: true })
cpSync(templateDir, targetDir, { recursive: true })
rmSync(join(targetDir, 'dist'), { recursive: true, force: true })
rmSync(join(targetDir, 'node_modules'), { recursive: true, force: true })

const pkgPath = join(targetDir, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.name = `@gamiq/${slug}`
pkg.title = title
pkg.description = 'TODO: describe your game'
pkg.emoji = '🎮'
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

const replaceInFile = (file, pairs) => {
  const path = join(targetDir, file)
  let content = readFileSync(path, 'utf8')
  for (const [from, to] of pairs) content = content.replaceAll(from, to)
  writeFileSync(path, content)
}

replaceInFile('index.html', [
  ['tap-rush', slug],
  ['Tap Rush', title],
])
replaceInFile('src/main.ts', [
  ["const GAME_ID = 'tap-rush'", `const GAME_ID = '${slug}'`],
  ['Tap Rush', title],
])

console.log(`✓ created games/${slug} ("${title}")`)
console.log('Next steps:')
console.log(`  pnpm install`)
console.log(`  pnpm -C games/${slug} dev`)
console.log(`  $EDITOR games/${slug}/src/main.ts   # build your game`)
