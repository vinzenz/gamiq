import { makeTile, requireCell } from './board.ts'
import type { Board, Cell, TileType } from './types.ts'

/**
 * Test/level helper: build a board from rows of palette characters.
 * A '.' cell is left empty (useful for gravity/refill fixtures).
 */
export function boardFromRows(rows: readonly string[], palette: Record<string, TileType>): Board {
  const height = rows.length
  const width = rows[0]?.length ?? 0
  const cells = rows.flatMap((row, y): Cell[] => {
    if (row.length !== width) {
      throw new Error(`row ${y} has length ${row.length}, expected ${width}`)
    }
    return [...row].map((char, x): Cell => {
      if (char === '.') return {}
      const type = palette[char]
      if (!type) throw new Error(`no palette entry for '${char}' at (${x}, ${y})`)
      return { tile: makeTile(type) }
    })
  })
  return { width, height, cells }
}

/** Tile-type matrix of a board, for structural comparisons in tests. */
export function typeMatrix(board: Board): (TileType | undefined)[][] {
  const rows: (TileType | undefined)[][] = []
  for (let y = 0; y < board.height; y++) {
    const row: (TileType | undefined)[] = []
    for (let x = 0; x < board.width; x++) row.push(requireCell(board, { x, y }).tile?.type)
    rows.push(row)
  }
  return rows
}

/** Match-4 fixture: swapping (2,2) with (2,1) lines up four skulls. */
export const RUN4_GRID = ['abcde', 'cdXab', 'XXbXa', 'bcaed', 'decab']

/** Match-5 fixture: swapping (2,2) with (2,1) lines up five skulls. */
export const RUN5_GRID = ['abcde', 'cdXab', 'XXbXX', 'bcaed', 'decab']

/** L/T fixture: swapping (2,2) with (3,2) forms an L of five skulls. */
export const LT_GRID = ['abXde', 'caXbd', 'XXbXc', 'dcaeb', 'eddca']

/** 2×2 fixture: swapping (1,1) with (1,2) closes the square of skulls. */
export const SQUARE_GRID = ['XXabc', 'Xbdea', 'aXcad', 'bcebe', 'cdadb']

/** Palette for the fixtures above (capital X is the skull pair colour). */
export const FIXTURE_PALETTE = {
  a: 'pumpkin',
  b: 'ghost',
  c: 'skull',
  d: 'bat',
  e: 'candy',
  f: 'potion',
  X: 'skull',
} as const
