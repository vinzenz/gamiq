const BOSS_LEVELS = new Set([7, 13, 20, 27, 34, 37, 40])
const CHAPTER_ENDS = [7, 13, 20, 27, 34, 40] as const

export interface ChapterTheme {
  name: string
  kicker: string
  top: string
  bottom: string
  path: string
  accent: string
}

export const CHAPTERS: readonly ChapterTheme[] = [
  {
    name: 'Calendar Workshop',
    kicker: 'Seven dates escaped',
    top: '#163d50',
    bottom: '#0b2439',
    path: '#fff0c7',
    accent: '#f5c451',
  },
  {
    name: 'Parcel Cloudport',
    kicker: 'Mail is arriving yesterday',
    top: '#205477',
    bottom: '#102f50',
    path: '#e4f6ff',
    accent: '#7cc9e8',
  },
  {
    name: 'Cocoa Comet Belt',
    kicker: 'Mind the marshmallow gravity',
    top: '#6b3344',
    bottom: '#2f223d',
    path: '#ffe0bd',
    accent: '#e69565',
  },
  {
    name: 'Backwards Blizzard',
    kicker: 'North has gone sideways',
    top: '#295e75',
    bottom: '#173549',
    path: '#ecfbff',
    accent: '#9de5f4',
  },
  {
    name: 'Moon-Wrapping Yard',
    kicker: 'Night is starting to crinkle',
    top: '#3a325f',
    bottom: '#191c3b',
    path: '#fff0c7',
    accent: '#f5c451',
  },
  {
    name: 'The Forty-First Door',
    kicker: 'There should only be forty',
    top: '#163c38',
    bottom: '#0a242d',
    path: '#fff5db',
    accent: '#c83e4d',
  },
]

export interface ChapterSpan {
  chapter: number
  first: number
  last: number
}

export function chapterOf(levelIndex: number): number {
  const id = levelIndex + 1
  return Math.min(CHAPTER_ENDS.filter((end) => end < id).length, CHAPTERS.length - 1)
}

export function chapterSpans(levelCount: number): ChapterSpan[] {
  const spans: ChapterSpan[] = []
  let first = 0
  while (first < levelCount) {
    const chapter = chapterOf(first)
    let last = first
    while (last + 1 < levelCount && chapterOf(last + 1) === chapter) last++
    spans.push({ chapter, first, last })
    first = last + 1
  }
  return spans.length ? spans : [{ chapter: 0, first: 0, last: 0 }]
}

export function isBossHouse(levelIndex: number, levelCount: number): boolean {
  const id = levelIndex + 1
  return id <= levelCount && BOSS_LEVELS.has(id)
}

export interface DoorNode {
  index: number
  x: number
  y: number
  chapter: number
  boss: boolean
}

export const NODE_STEP = 116
export const CHAPTER_GAP = 94
const TOP_PAD = 260
const BOTTOM_PAD = 240

/** Build a broad S-curve. Level 1 sits at the bottom and level 40 at the top. */
export function layoutDoors(
  width: number,
  levelCount: number,
): { nodes: DoorNode[]; contentHeight: number } {
  const count = Math.max(1, levelCount)
  let distance = 0
  for (let i = 1; i < count; i++) {
    distance += NODE_STEP
    if (chapterOf(i) !== chapterOf(i - 1)) distance += CHAPTER_GAP
  }
  const contentHeight = TOP_PAD + distance + BOTTOM_PAD
  let y = contentHeight - BOTTOM_PAD
  const safeWidth = Math.max(0, width - 128)
  const nodes: DoorNode[] = []
  for (let index = 0; index < count; index++) {
    const wave = 0.5 + Math.sin(index * 1.12 - 0.8) * 0.36
    nodes.push({
      index,
      x: 64 + safeWidth * wave,
      y,
      chapter: chapterOf(index),
      boss: isBossHouse(index, count),
    })
    y -= NODE_STEP
    if (index + 1 < count && chapterOf(index + 1) !== chapterOf(index)) y -= CHAPTER_GAP
  }
  return { nodes, contentHeight }
}
