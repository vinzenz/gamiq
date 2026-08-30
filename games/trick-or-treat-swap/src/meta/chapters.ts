/**
 * Alley chapters (ticket ToTS-ra73yg). The single scrolling strip is split
 * into themed street segments of `LEVELS_PER_CHAPTER` doors each; every
 * chapter's final door is a boss house. Levels are appended over time, so
 * the span helpers take the level count explicitly and adapt: an unfinished
 * last chapter simply stays short.
 */

export const LEVELS_PER_CHAPTER = 6

export interface ChapterTheme {
  name: string
  /** Segment backdrop band, top → bottom. */
  groundTop: string
  groundBottom: string
  /** Walking route colours. */
  path: string
  pathEdge: string
  house: string
  roof: string
  /** Door + sign accent. */
  accent: string
  windowGlow: string
  props: 'houses' | 'graves' | 'trees' | 'pumpkins' | 'hill' | 'castle'
}

export const CHAPTERS: readonly ChapterTheme[] = [
  {
    name: 'Maple Lane',
    groundTop: '#251a41',
    groundBottom: '#181132',
    path: '#3a2c55',
    pathEdge: '#513e73',
    house: '#4c3a67',
    roof: '#332550',
    accent: '#ff8a2a',
    windowGlow: '#ffd23f',
    props: 'houses',
  },
  {
    name: 'Graveyard Path',
    groundTop: '#1c2038',
    groundBottom: '#131628',
    path: '#333750',
    pathEdge: '#484d6b',
    house: '#3d4360',
    roof: '#292e45',
    accent: '#9fd8ff',
    windowGlow: '#bfe8ff',
    props: 'graves',
  },
  {
    name: "Witch's Hollow",
    groundTop: '#17251f',
    groundBottom: '#0f1a16',
    path: '#2c4034',
    pathEdge: '#3d5745',
    house: '#37503f',
    roof: '#24382b',
    accent: '#6fe38a',
    windowGlow: '#a8ffc0',
    props: 'trees',
  },
  {
    name: 'Pumpkin Patch',
    groundTop: '#2b1c14',
    groundBottom: '#1c110c',
    path: '#4a3220',
    pathEdge: '#654530',
    house: '#543a22',
    roof: '#3a2716',
    accent: '#ffb23f',
    windowGlow: '#ffd23f',
    props: 'pumpkins',
  },
  {
    name: 'Cemetery Hill',
    groundTop: '#1a1f33',
    groundBottom: '#101425',
    path: '#313852',
    pathEdge: '#454e70',
    house: '#3c4463',
    roof: '#282e47',
    accent: '#b8aaff',
    windowGlow: '#d6c8ff',
    props: 'hill',
  },
  {
    name: 'Castle Dracula Alley',
    groundTop: '#241019',
    groundBottom: '#170a10',
    path: '#40202c',
    pathEdge: '#5a2d3d',
    house: '#43222f',
    roof: '#2e161f',
    accent: '#ff5a5a',
    windowGlow: '#ffb3b3',
    props: 'castle',
  },
]

export interface ChapterSpan {
  /** Index into `CHAPTERS` (clamped to the last theme). */
  chapter: number
  /** First/last level index of the segment, inclusive. */
  first: number
  last: number
}

export function chapterCount(levelCount: number): number {
  return Math.max(1, Math.ceil(levelCount / LEVELS_PER_CHAPTER))
}

/** Chapter a level belongs to, clamped to the last defined theme. */
export function chapterOf(levelIndex: number): number {
  return Math.min(Math.floor(Math.max(0, levelIndex) / LEVELS_PER_CHAPTER), CHAPTERS.length - 1)
}

/** Level index ranges of each street segment, in strip order. */
export function chapterSpans(levelCount: number): ChapterSpan[] {
  const spans: ChapterSpan[] = []
  for (let first = 0; first < levelCount; first += LEVELS_PER_CHAPTER) {
    spans.push({
      chapter: Math.min(spans.length, CHAPTERS.length - 1),
      first,
      last: Math.min(first + LEVELS_PER_CHAPTER, levelCount) - 1,
    })
  }
  return spans.length > 0 ? spans : [{ chapter: 0, first: 0, last: 0 }]
}

/** A chapter-final door: last of its segment or the campaign's last level. */
export function isChapterFinal(levelIndex: number, levelCount: number): boolean {
  const last = levelCount - 1
  return (
    levelIndex === last ||
    (levelIndex % LEVELS_PER_CHAPTER === LEVELS_PER_CHAPTER - 1 && levelIndex < last)
  )
}

export interface DoorNode {
  /** Level index; level id is `index + 1` for the current campaign. */
  index: number
  /** World position of the door's path point (the kid's feet). */
  x: number
  y: number
  chapter: number
  boss: boolean
}

/** Vertical distance between door nodes, plus an extra gap between chapters. */
export const NODE_STEP = 128
export const CHAPTER_GAP = 74
const PAD_TOP = 118
const PAD_BOTTOM = 116
const JITTER = 12

/** Deterministic per-index wobble so the zigzag does not look machine-made. */
function jitter(index: number): number {
  return Math.sin(index * 12.9898) * JITTER
}

/**
 * Lay the strip out for a viewport width: doors zigzag left/right from the
 * bottom (level 1) upward, with a wider gap at chapter boundaries. Y values
 * are width-independent, so a resize only reflows x.
 */
export function layoutDoors(
  width: number,
  levelCount: number,
): { nodes: DoorNode[]; contentHeight: number } {
  const count = Math.max(1, levelCount)
  let span = 0
  for (let i = 1; i < count; i++) {
    span += NODE_STEP
    if (chapterOf(i) !== chapterOf(i - 1)) span += CHAPTER_GAP
  }
  const contentHeight = PAD_TOP + span + PAD_BOTTOM
  const nodes: DoorNode[] = []
  let y = contentHeight - PAD_BOTTOM
  for (let index = 0; index < count; index++) {
    const boss = isChapterFinal(index, count)
    const side = index % 2 === 0 ? 0.27 : 0.73
    nodes.push({
      index,
      x: Math.round(Math.min(Math.max(width * side + (boss ? 0 : jitter(index)), 44), width - 44)),
      y,
      chapter: chapterOf(index),
      boss,
    })
    const next = index + 1
    y -= NODE_STEP
    if (next < count && chapterOf(next) !== chapterOf(index)) y -= CHAPTER_GAP
  }
  return { nodes, contentHeight }
}
