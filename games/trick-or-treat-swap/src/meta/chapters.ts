/**
 * Alley chapters (ticket ToTS-ra73yg). The strip is split into themed street
 * segments that each end in a boss house; the boundaries follow the actual
 * level data (a level is a boss house iff it ships a boss goal), so segments
 * have the lengths 7/6/7/7/7/6 for the shipped 40 levels. Castle Dracula
 * Alley contains a mid-chapter boss (37) before the campaign finale (40).
 */

/** 1-based ids of boss-house doors in play order. */
const BOSS_DOOR_IDS: readonly number[] = [7, 13, 20, 27, 34, 37, 40]
/** Final door of each chapter — the last six of those are also boss houses. */
const CHAPTER_FINAL_IDS: readonly number[] = [7, 13, 20, 27, 34, 40]

const bossDoorSet = new Set(BOSS_DOOR_IDS)

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
  return Math.max(1, CHAPTER_FINAL_IDS.filter((id) => id <= levelCount).length)
}

/** Chapter a level belongs to, clamped to the last defined theme. */
export function chapterOf(levelIndex: number): number {
  const id = levelIndex + 1
  return Math.min(
    Math.max(0, CHAPTER_FINAL_IDS.filter((final) => final < id).length),
    CHAPTERS.length - 1,
  )
}

/** Level index ranges of each street segment, in strip order. */
export function chapterSpans(levelCount: number): ChapterSpan[] {
  const spans: ChapterSpan[] = []
  let first = 0
  while (first < levelCount) {
    const chapter = chapterOf(first)
    let last = first
    while (last + 1 < levelCount && chapterOf(last + 1) === chapter) last++
    spans.push({
      chapter: Math.min(chapter, CHAPTERS.length - 1),
      first,
      last,
    })
    first = last + 1
  }
  return spans.length > 0 ? spans : [{ chapter: 0, first: 0, last: 0 }]
}

/** A boss-house door: chapter finals plus the castle's mid-chapter boss. */
export function isBossHouse(levelIndex: number, levelCount: number): boolean {
  const id = levelIndex + 1
  return id >= 1 && id <= levelCount && bossDoorSet.has(id)
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
const PAD_TOP = 238
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
    const boss = isBossHouse(index, count)
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
