// Arm the engine's plug-in modules (power-ups, combos, obstacles, boss).
// Levels reference registered modifier ids (cover-1, blocker-2, …) and
// their bosses need them at attach time, so anything that loads the campaign
// gets the fully-armed engine — see src/engine/index.ts.
import '@gamiq/swap3'
import type { LevelGame } from '@gamiq/swap3/goals'
import { createLevelGame } from '@gamiq/swap3/goals'
import { level1 } from './level-1.ts'
import { level2 } from './level-2.ts'
import { level3 } from './level-3.ts'
import { level4 } from './level-4.ts'
import { level5 } from './level-5.ts'
import { level6 } from './level-6.ts'
import { level7 } from './level-7.ts'
import { level8 } from './level-8.ts'
import { level9 } from './level-9.ts'
import { level10 } from './level-10.ts'
import { level11 } from './level-11.ts'
import { level12 } from './level-12.ts'
import { level13 } from './level-13.ts'
import { level14 } from './level-14.ts'
import { level15 } from './level-15.ts'
import { level16 } from './level-16.ts'
import { level17 } from './level-17.ts'
import { level18 } from './level-18.ts'
import { level19 } from './level-19.ts'
import { level20 } from './level-20.ts'
import { level21 } from './level-21.ts'
import { level22 } from './level-22.ts'
import { level23 } from './level-23.ts'
import { level24 } from './level-24.ts'
import { level25 } from './level-25.ts'
import { level26 } from './level-26.ts'
import { level27 } from './level-27.ts'
import { level28 } from './level-28.ts'
import { level29 } from './level-29.ts'
import { level30 } from './level-30.ts'
import { level31 } from './level-31.ts'
import { level32 } from './level-32.ts'
import { level33 } from './level-33.ts'
import { level34 } from './level-34.ts'
import { level35 } from './level-35.ts'
import { level36 } from './level-36.ts'
import { level37 } from './level-37.ts'
import { level38 } from './level-38.ts'
import { level39 } from './level-39.ts'
import { level40 } from './level-40.ts'

/**
 * The campaign in play order — the whole alley, six chapters (see LEVELS.md
 * and DIFFICULTY.md): Maple Lane 1–7 teaches the basics, all four power-ups,
 * the first combo and cobwebs, ending at the first boss house; Graveyard Path
 * 8–13 mixes webs and gravestones with collect/deliver goals and ends at the
 * second boss; Witch's Hollow 14–20 adds cursed ice; Pumpkin Patch 21–27
 * locks and slime; Cemetery Hill 28–34 mixes everything on tight budgets;
 * Castle Dracula Alley 35–40 is the finale with two boss houses.
 */
export const LEVELS = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level6,
  level7,
  level8,
  level9,
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level16,
  level17,
  level18,
  level19,
  level20,
  level21,
  level22,
  level23,
  level24,
  level25,
  level26,
  level27,
  level28,
  level29,
  level30,
  level31,
  level32,
  level33,
  level34,
  level35,
  level36,
  level37,
  level38,
  level39,
  level40,
]

/** Build the n-th level (0-based) as a wired, ready-to-play game. */
export function levelGame(n: number): LevelGame {
  const raw = LEVELS[n]
  if (raw === undefined) throw new Error(`no level at index ${n} (${LEVELS.length} exist)`)
  return createLevelGame(raw)
}
