import type { PowerupKind, TileType } from '@gamiq/swap3/types'
import treatBagUrl from '../../assets/meta/treat-bag.webp'
import cobweb1Url from '../../assets/sprites/obstacle-cobweb-1.webp'
import cobweb2Url from '../../assets/sprites/obstacle-cobweb-2.webp'
import cobweb3Url from '../../assets/sprites/obstacle-cobweb-3.webp'
import gravestoneUrl from '../../assets/sprites/obstacle-gravestone.webp'
import iceUrl from '../../assets/sprites/obstacle-ice.webp'
import lockUrl from '../../assets/sprites/obstacle-lock.webp'
import slimeUrl from '../../assets/sprites/obstacle-slime.webp'
import broomUrl from '../../assets/sprites/power-broom.webp'
import cauldronUrl from '../../assets/sprites/power-cauldron.webp'
import littleGhostUrl from '../../assets/sprites/power-little-ghost.webp'
import bombUrl from '../../assets/sprites/power-pumpkin-bomb.webp'
import batUrl from '../../assets/sprites/tile-bat.webp'
import candyUrl from '../../assets/sprites/tile-candy.webp'
import ghostUrl from '../../assets/sprites/tile-ghost.webp'
import potionUrl from '../../assets/sprites/tile-potion.webp'
import pumpkinUrl from '../../assets/sprites/tile-pumpkin.webp'
import skullUrl from '../../assets/sprites/tile-skull.webp'
import { roundRectPath } from './draw.ts'

/** Fallback fill and particle colour per tile type (from the style block). */
export const TILE_COLORS: Record<TileType, string> = {
  red: '#ff8a2a',
  blue: '#a8d8f8',
  ivory: '#e8e0cf',
  purple: '#9b6dd6',
  pink: '#ff7ac2',
  green: '#6fe38a',
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
  red: pumpkinUrl,
  blue: ghostUrl,
  ivory: skullUrl,
  purple: batUrl,
  pink: candyUrl,
  green: potionUrl,
}

export const tileSprites = {
  red: loadImage(pumpkinUrl),
  blue: loadImage(ghostUrl),
  ivory: loadImage(skullUrl),
  purple: loadImage(batUrl),
  pink: loadImage(candyUrl),
  green: loadImage(potionUrl),
} satisfies Record<TileType, HTMLImageElement>

/** Treat basket on the board's bottom row for deliver goals. */
export const treatBagSprite = loadImage(treatBagUrl)

export const powerupSprites: Record<PowerupKind, HTMLImageElement> = {
  sweep: loadImage(broomUrl),
  blast: loadImage(bombUrl),
  prism: loadImage(cauldronUrl),
  homing: loadImage(littleGhostUrl),
}

const cobwebSprites = [loadImage(cobweb1Url), loadImage(cobweb2Url), loadImage(cobweb3Url)]
const gravestoneImg = loadImage(gravestoneUrl)
const iceImg = loadImage(iceUrl)
const lockImg = loadImage(lockUrl)
const slimeImg = loadImage(slimeUrl)

/** `cover-2` → `{ root: 'cover', count: 2 }`; `ice` → `{ root: 'ice', count: 0 }`. */
function parseModifier(id: string): { root: string; count: number } {
  const m = /^([a-z]+)(?:-(\d+))?$/.exec(id)
  return { root: m?.[1] ?? id, count: Number(m?.[2] ?? 0) }
}

function cobwebFor(count: number): HTMLImageElement | undefined {
  const index = Math.min(Math.max(count, 1), cobwebSprites.length) - 1
  return cobwebSprites[index] ?? cobwebSprites[0]
}

/** Sprite for a cell modifier; undefined for ids without art (void, boss). */
export function modifierSprite(modifier: string): HTMLImageElement | undefined {
  const { root, count } = parseModifier(modifier)
  switch (root) {
    case 'cover':
      return cobwebFor(count)
    case 'blocker':
      return gravestoneImg
    case 'ice':
      return iceImg
    case 'lock':
      return lockImg
    case 'spreader':
      return slimeImg
    default:
      return undefined
  }
}

/** URL for a modifier sprite, for DOM chips; undefined when there is no art. */
export function modifierSpriteUrl(modifier: string): string | undefined {
  const { root, count } = parseModifier(modifier)
  switch (root) {
    case 'cover':
      return cobwebFor(count)?.src
    case 'blocker':
      return gravestoneUrl
    case 'ice':
      return iceUrl
    case 'lock':
      return lockUrl
    case 'spreader':
      return slimeUrl
    default:
      return undefined
  }
}

export const POWERUP_LABELS: Record<PowerupKind, string> = {
  sweep: "Witch's Broom!",
  blast: 'Pumpkin Bomb!',
  prism: 'Magic Cauldron!',
  homing: 'Little Ghost!',
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
