import type { TutorialScript } from './types.ts'

/**
 * The teaching campaign (ticket GiftGlitch-a5d77f, concept epic 9pbwcw):
 *
 * - L1–2 match-3 basics, L3 broom, L4 pumpkin bomb, L5 cauldron + ghost +
 *   the first combo teaser — as scripted, mostly `start`-triggered overlays.
 * - L6–12 teach one combo each, shown when the player first *can* (both
 *   halves on the board) *or does* build it — an `any-of` of a
 *   `powerups-present` and a `combo` trigger.
 * - One-liner popups fire the first time each obstacle appears, ever
 *   (persistence is the seen store's job, not the content's).
 *
 * Steps are plain data in the `types.ts` format so content tickets
 * (GiftGlitch-wcyafa, GiftGlitch-x40f2s) can author or retune them without touching the
 * engine: add entries here, or attach a `tutorial` script list of your own
 * and pass it to the director alongside `levelScripts()`.
 */

const L1: TutorialScript = {
  id: 'level-1',
  steps: [
    {
      id: 'level-1-welcome',
      trigger: { kind: 'start' },
      title: 'The calendar broke!',
      text: 'Swap two neighbouring Christmas tokens to line up 3 of a kind.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-1-first-match',
      trigger: { kind: 'start' },
      text: 'See the glowing pair? Swap them to make your first match.',
      highlight: { kind: 'hint' },
      await: { kind: 'move' },
    },
    {
      id: 'level-1-goal',
      trigger: { kind: 'start' },
      text: 'Finish the dispatch before your moves run out!',
      await: { kind: 'seconds', seconds: 4 },
    },
  ],
}

const L2: TutorialScript = {
  id: 'level-2',
  steps: [
    {
      id: 'level-2-bigger',
      trigger: { kind: 'start' },
      title: 'Bigger matches, bigger magic',
      text: 'Match 4 or more tokens in a line to build a power-up.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-2-goal',
      trigger: { kind: 'start' },
      text: 'Reach every goal at the top to repair this dispatch.',
      await: { kind: 'seconds', seconds: 4 },
    },
  ],
}

const L3: TutorialScript = {
  id: 'level-3',
  steps: [
    {
      id: 'level-3-broom',
      trigger: { kind: 'start' },
      title: 'Rocket Sleigh unlocked',
      text: 'Match 4 in a row to build a Rocket Sleigh.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-3-broom-use',
      trigger: { kind: 'powerup-created', powerup: 'sweep' },
      title: 'Rocket Sleigh!',
      text: 'Tap it to clear its whole row or column.',
      highlight: { kind: 'powerup', powerup: 'sweep' },
      await: { kind: 'activate', powerup: 'sweep' },
    },
  ],
}

const L4: TutorialScript = {
  id: 'level-4',
  steps: [
    {
      id: 'level-4-bomb',
      trigger: { kind: 'start' },
      title: 'Christmas Cracker unlocked',
      text: 'Match 5 in an L or T shape to make a Christmas Cracker.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-4-bomb-use',
      trigger: { kind: 'powerup-created', powerup: 'blast' },
      title: 'Christmas Cracker!',
      text: 'Tap it to blast everything around it in a 3×3.',
      highlight: { kind: 'powerup', powerup: 'blast' },
      await: { kind: 'activate', powerup: 'blast' },
    },
  ],
}

const L5: TutorialScript = {
  id: 'level-5',
  steps: [
    {
      id: 'level-5-cauldron',
      trigger: { kind: 'start' },
      title: 'Two more inventions',
      text: 'Match 5 in a straight line to make an Aurora Snow Globe. Swap it with any token to clear that colour.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-5-ghost',
      trigger: { kind: 'start' },
      title: 'And a Crumb Drone',
      text: 'Match a 2×2 square to launch a Crumb Drone. It flies to the nearest goal token.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-5-combo-teaser',
      trigger: { kind: 'powerups-present', a: 'sweep', b: 'sweep' },
      title: '✨ Combo hint',
      text: 'Two Rocket Sleighs! Swap them into each other for a Cross Sweep.',
      highlight: { kind: 'powerups', a: 'sweep', b: 'sweep' },
      await: { kind: 'tap' },
    },
  ],
}

/** One combo taught per level, L6–12, in the epic's combo-table order. */
function comboLevel(
  levelId: number,
  a: 'sweep' | 'blast' | 'prism' | 'homing',
  b: 'sweep' | 'blast' | 'prism' | 'homing',
  title: string,
  text: string,
): TutorialScript {
  return {
    id: `level-${levelId}`,
    steps: [
      {
        id: `level-${levelId}-combo`,
        trigger: {
          kind: 'any-of',
          of: [
            { kind: 'powerups-present', a, b },
            { kind: 'combo', a, b },
          ],
        },
        title,
        text,
        highlight: { kind: 'powerups', a, b },
        await: { kind: 'tap' },
      },
    ],
  }
}

const COMBO_LEVELS: readonly TutorialScript[] = [
  comboLevel(
    6,
    'sweep',
    'sweep',
    'Cross Sweep',
    'Swap two Rocket Sleighs to clear a row and a column.',
  ),
  comboLevel(
    7,
    'sweep',
    'homing',
    'Express delivery',
    'Swap a Rocket Sleigh with a Crumb Drone. The drone carries it to the busiest line.',
  ),
  comboLevel(
    8,
    'sweep',
    'blast',
    'Triple Sweep',
    'Swap a Rocket Sleigh with a Christmas Cracker to clear three rows and three columns.',
  ),
  comboLevel(
    9,
    'sweep',
    'prism',
    'Sleigh brigade',
    'Swap a Rocket Sleigh into an Aurora Snow Globe. The most common colour becomes a fleet of sleighs.',
  ),
  comboLevel(
    10,
    'homing',
    'homing',
    'Three Crumb Drones',
    'Swap two Crumb Drones. Three drones fly out and find three goal tokens.',
  ),
  comboLevel(
    11,
    'homing',
    'blast',
    'Cracker delivery',
    'Swap a Crumb Drone with a Christmas Cracker. It carries the cracker to the busiest cluster.',
  ),
  comboLevel(
    12,
    'blast',
    'blast',
    'Giant Cracker',
    'Swap two Christmas Crackers for a huge 5×5 clear.',
  ),
]

/** First-obstacle popups: one-liner + highlight, once per player ever. */
const OBSTACLE_SCRIPTS: readonly TutorialScript[] = [
  {
    id: 'obstacle-cobweb',
    steps: [
      {
        id: 'obstacle-cover-intro',
        trigger: { kind: 'obstacle-seen', root: 'cover' },
        title: 'Tinsel tangle!',
        text: 'Match on a tangled tile to pull the tinsel off.',
        highlight: { kind: 'modifier', root: 'cover' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-gravestone',
    steps: [
      {
        id: 'obstacle-blocker-intro',
        trigger: { kind: 'obstacle-seen', root: 'blocker' },
        title: 'Parcel pile!',
        text: 'The parcels will not move. Clear them with matches right beside them.',
        highlight: { kind: 'modifier', root: 'blocker' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-ice',
    steps: [
      {
        id: 'obstacle-ice-intro',
        trigger: { kind: 'obstacle-seen', root: 'ice' },
        title: 'Deep frost!',
        text: 'Frozen tokens cannot move. Crack the frost with a match of their colour.',
        highlight: { kind: 'modifier', root: 'ice' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-lock',
    steps: [
      {
        id: 'obstacle-lock-intro',
        trigger: { kind: 'obstacle-seen', root: 'lock' },
        title: 'Ribbon lock!',
        text: 'The token cannot move until you match its colour and open the ribbon lock.',
        highlight: { kind: 'modifier', root: 'lock' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-slime',
    steps: [
      {
        id: 'obstacle-spreader-intro',
        trigger: { kind: 'obstacle-seen', root: 'spreader' },
        title: 'Runaway wrapping paper!',
        text: 'It spreads every few moves. Match beside it before it wraps another tile.',
        highlight: { kind: 'modifier', root: 'spreader' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
]

/** The scripted levels, keyed by level id (L1–L12). */
const LEVEL_SCRIPTS: readonly TutorialScript[] = [L1, L2, L3, L4, L5, ...COMBO_LEVELS]

/** Scripts to play for a level: its own script first, then obstacle popups. */
export function levelScripts(levelId: number): TutorialScript[] {
  const level = LEVEL_SCRIPTS.find((script) => script.id === `level-${levelId}`)
  return [...(level ? [level] : []), ...OBSTACLE_SCRIPTS]
}
