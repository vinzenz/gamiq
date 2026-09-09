import { registerCellModifier } from '@gamiq/swap3/registry'
import type { Board } from '@gamiq/swap3/types'

/**
 * Compatibility aliases for the placeholder levels. `src/levels/level-3.ts`
 * and `level-5.ts` predate the numbered modifier ids that `obstacles.ts`
 * registers (`cover-1`, `blocker-3`): they place the bare ids `cobweb`
 * and `gravestone`, which would otherwise have no behaviour and make those
 * levels' clear-modifier goals unreachable. Register the easiest form of each
 * obstacle under the bare id — one direct hit peels/breaks. The content
 * ticket (GiftGlitch-wcyafa) renumbers the campaign; once the levels use numbered
 * ids this module can be deleted.
 */
export function registerLegacyObstacleAliases(): void {
  registerCellModifier({
    id: 'cover',
    gravityBarrier: true,
    onHit: (hit, emit) => {
      // Like cobwebs generally: only clears landing on the webbed tile peel.
      if (!hit.direct) return
      hit.cell.modifier = undefined
      emit({ type: 'obstacle', at: hit.at, modifier: 'cover', action: 'destroy' })
    },
  })
  registerCellModifier({
    id: 'blocker',
    gravityBarrier: true,
    onHit: (hit, emit) => {
      hit.cell.modifier = undefined
      emit({ type: 'obstacle', at: hit.at, modifier: 'blocker', action: 'destroy' })
    },
  })
}

const TILELESS_ROOTS = new Set(['blocker', 'spreader'])

/**
 * Gravestones and slimes occupy their cell without a tile (engine docs), but
 * `buildLevelBoard` leaves the initial board fill in place under the modifier
 * it attaches. Strip those leftover tiles at level start so the obstacle
 * renders and plays as documented — immovable, unmatchable, nothing spawns
 * there. Level data is content-ticket territory; this stays out of the engine.
 */
export function stripTilelessObstacleTiles(board: Board): void {
  for (const cell of board.cells) {
    const root = cell.modifier?.match(/^[a-z]+/)?.[0]
    if (root && TILELESS_ROOTS.has(root)) cell.tile = undefined
  }
}
