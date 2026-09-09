import type { PowerupKind, TileType } from '@gamiq/swap3/types'
import iceUrl from '../../assets/sprites/obstacle-ice.webp'
import lockUrl from '../../assets/sprites/obstacle-lock.webp'
import blockerUrl from '../../assets/sprites/obstacle-parcels.webp'
import tinselUrl from '../../assets/sprites/obstacle-tinsel.webp'
import spreaderUrl from '../../assets/sprites/obstacle-wrapping-paper.webp'
import blastUrl from '../../assets/sprites/power-cracker.webp'
import homingUrl from '../../assets/sprites/power-crumb-drone.webp'
import sweepUrl from '../../assets/sprites/power-rocket-sleigh.webp'
import prismUrl from '../../assets/sprites/power-snow-globe.webp'
import bellUrl from '../../assets/sprites/tile-bell.webp'
import candyCaneUrl from '../../assets/sprites/tile-candy-cane.webp'
import cookieUrl from '../../assets/sprites/tile-cookie.webp'
import mittenUrl from '../../assets/sprites/tile-mitten.webp'
import presentUrl from '../../assets/sprites/tile-present.webp'
import snowflakeUrl from '../../assets/sprites/tile-snowflake.webp'
import { roundRectPath } from './draw.ts'

/** Fallback fill and particle colour per tile type (from the style block). */
export const TILE_COLORS: Record<TileType, string> = {
  red: '#c83e4d',
  blue: '#7cc9e8',
  ivory: '#fff5db',
  purple: '#9a4fa4',
  pink: '#ef6f9a',
  green: '#2b8a6e',
}

function loadImage(src: string): HTMLImageElement {
  const img = new Image()
  img.src = src
  return img
}

/** Load an arbitrary sprite url (e.g. a chapter's boss portrait). */
export function loadSprite(src: string): HTMLImageElement {
  return loadImage(src)
}

export const TILE_URLS: Record<TileType, string> = {
  red: bellUrl,
  blue: snowflakeUrl,
  ivory: cookieUrl,
  purple: mittenUrl,
  pink: candyCaneUrl,
  green: presentUrl,
}

export const tileSprites = {
  red: loadImage(bellUrl),
  blue: loadImage(snowflakeUrl),
  ivory: loadImage(cookieUrl),
  purple: loadImage(mittenUrl),
  pink: loadImage(candyCaneUrl),
  green: loadImage(presentUrl),
} satisfies Record<TileType, HTMLImageElement>

/** Treat basket on the board's bottom row for deliver goals. */
export const treatBagSprite = loadImage(presentUrl)

export const powerupSprites: Record<PowerupKind, HTMLImageElement> = {
  sweep: loadImage(sweepUrl),
  blast: loadImage(blastUrl),
  prism: loadImage(prismUrl),
  homing: loadImage(homingUrl),
}

const coverSprites = [loadImage(tinselUrl), loadImage(tinselUrl), loadImage(tinselUrl)]
const blockerImg = loadImage(blockerUrl)
const iceImg = loadImage(iceUrl)
const lockImg = loadImage(lockUrl)
const spreaderImg = loadImage(spreaderUrl)

/** `cover-2` → `{ root: 'cover', count: 2 }`; `ice` → `{ root: 'ice', count: 0 }`. */
function parseModifier(id: string): { root: string; count: number } {
  const m = /^([a-z]+)(?:-(\d+))?$/.exec(id)
  return { root: m?.[1] ?? id, count: Number(m?.[2] ?? 0) }
}

function coverFor(count: number): HTMLImageElement | undefined {
  const index = Math.min(Math.max(count, 1), coverSprites.length) - 1
  return coverSprites[index] ?? coverSprites[0]
}

/** Sprite for a cell modifier; undefined for ids without art (void, boss). */
export function modifierSprite(modifier: string): HTMLImageElement | undefined {
  const { root, count } = parseModifier(modifier)
  switch (root) {
    case 'cover':
      return coverFor(count)
    case 'blocker':
      return blockerImg
    case 'ice':
      return iceImg
    case 'lock':
      return lockImg
    case 'spreader':
      return spreaderImg
    default:
      return undefined
  }
}

/** URL for a modifier sprite, for DOM chips; undefined when there is no art. */
export function modifierSpriteUrl(modifier: string): string | undefined {
  const { root, count } = parseModifier(modifier)
  switch (root) {
    case 'cover':
      return coverFor(count)?.src
    case 'blocker':
      return blockerUrl
    case 'ice':
      return iceUrl
    case 'lock':
      return lockUrl
    case 'spreader':
      return spreaderUrl
    default:
      return undefined
  }
}

export const POWERUP_LABELS: Record<PowerupKind, string> = {
  sweep: 'Rocket Sleigh!',
  blast: 'Christmas Cracker!',
  prism: 'Aurora Snow Globe!',
  homing: 'Crumb Drone!',
}

export interface SpriteDrawOptions {
  alpha?: number
  scaleX?: number
  scaleY?: number
  /** Rounded-square fallback colour while the sprite is still loading. */
  fallback?: string
}

/** Draw a sprite centred on (cx, cy) at `size` logical pixels. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cx: number,
  cy: number,
  size: number,
  opts: SpriteDrawOptions = {},
): void {
  const { alpha = 1, scaleX = 1, scaleY = 1, fallback } = opts
  const w = size * scaleX
  const h = size * scaleY
  if (w <= 0.5 || h <= 0.5) return
  ctx.globalAlpha = alpha
  if (img?.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
  } else if (fallback) {
    ctx.fillStyle = fallback
    roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, w * 0.22)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
