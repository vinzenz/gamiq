import { loadJSON, saveJSON } from '@gamiq/shared'

/**
 * Earned stars per level id. The alley-map progression ticket (ToTS-ra73yg)
 * will grow this into unlock state; for now the play screen just records the
 * best star result per level so replays keep the higher score.
 */
const KEY = 'trick-or-treat-swap:stars'

export function loadStars(): Record<string, number> {
  return loadJSON(KEY, {})
}

export function recordStars(levelId: number, stars: number): void {
  const all = loadStars()
  if (stars > (all[String(levelId)] ?? 0)) {
    all[String(levelId)] = stars
    saveJSON(KEY, all)
  }
}
