import type { TutorialScript } from './types.ts'

/**
 * The teaching campaign (ticket ToTS-a5d77f, concept epic 9pbwcw):
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
 * (ToTS-wcyafa, ToTS-x40f2s) can author or retune them without touching the
 * engine: add entries here, or attach a `tutorial` script list of your own
 * and pass it to the director alongside `levelScripts()`.
 */

const L1: TutorialScript = {
  id: 'level-1',
  steps: [
    {
      id: 'level-1-welcome',
      trigger: { kind: 'start' },
      title: '🎃 Trick or Treat!',
      text: 'Swap two neighbouring treats to line up 3 of a kind and collect them.',
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
      text: 'Fill the treat bag before your moves run out!',
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
      text: 'Match 4 or more treats in a line and something magical happens…',
      await: { kind: 'tap' },
    },
    {
      id: 'level-2-goal',
      trigger: { kind: 'start' },
      text: 'Reach every goal chip up top to open the next door.',
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
      title: '🧹 New treat unlocked',
      text: 'Match 4 in a row to craft a Witch’s Broom.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-3-broom-use',
      trigger: { kind: 'powerup-created', powerup: 'broom' },
      title: 'A Witch’s Broom!',
      text: 'Tap it to sweep away its whole row or column.',
      highlight: { kind: 'powerup', powerup: 'broom' },
      await: { kind: 'activate', powerup: 'broom' },
    },
  ],
}

const L4: TutorialScript = {
  id: 'level-4',
  steps: [
    {
      id: 'level-4-bomb',
      trigger: { kind: 'start' },
      title: '💥 New treat unlocked',
      text: 'Match 5 in an L or T shape to carve a Pumpkin Bomb.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-4-bomb-use',
      trigger: { kind: 'powerup-created', powerup: 'bomb' },
      title: 'Pumpkin Bomb!',
      text: 'Tap it to blast everything around it in a 3×3.',
      highlight: { kind: 'powerup', powerup: 'bomb' },
      await: { kind: 'activate', powerup: 'bomb' },
    },
  ],
}

const L5: TutorialScript = {
  id: 'level-5',
  steps: [
    {
      id: 'level-5-cauldron',
      trigger: { kind: 'start' },
      title: '⚗️ Two new treats tonight',
      text: 'Match 5 in a straight line to brew a Magic Cauldron — swap it with any treat to clear that whole colour.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-5-ghost',
      trigger: { kind: 'start' },
      title: '👻 And a Little Ghost',
      text: 'Match a 2×2 square to free a Little Ghost — it flies to the nearest goal treat and pops it.',
      await: { kind: 'tap' },
    },
    {
      id: 'level-5-combo-teaser',
      trigger: { kind: 'powerups-present', a: 'broom', b: 'broom' },
      title: '✨ Combo hint',
      text: 'Two brooms on the board! Swap them into each other for a Cross Sweep.',
      highlight: { kind: 'powerups', a: 'broom', b: 'broom' },
      await: { kind: 'tap' },
    },
  ],
}

/** One combo taught per level, L6–12, in the epic's combo-table order. */
function comboLevel(
  levelId: number,
  a: 'broom' | 'bomb' | 'cauldron' | 'little-ghost',
  b: 'broom' | 'bomb' | 'cauldron' | 'little-ghost',
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
    'broom',
    'broom',
    '🧹 Cross Sweep',
    'Swap a broom into another broom — it clears its row AND its column.',
  ),
  comboLevel(
    7,
    'broom',
    'little-ghost',
    '👻🧹 Ghostly delivery',
    'Swap a broom with a Little Ghost — the ghost carries it to the densest line and sweeps.',
  ),
  comboLevel(
    8,
    'broom',
    'bomb',
    '💥 Triple Sweep',
    'Swap a broom with a Pumpkin Bomb — three rows AND three columns at once!',
  ),
  comboLevel(
    9,
    'broom',
    'cauldron',
    '⚗️ Broom brigade',
    'Swap a broom into the Cauldron — every treat of the most common colour becomes a broom and sweeps away.',
  ),
  comboLevel(
    10,
    'little-ghost',
    'little-ghost',
    '👻👻 Three little ghosts',
    'Swap two Little Ghosts — three of them fly out and pop three goal treats.',
  ),
  comboLevel(
    11,
    'little-ghost',
    'bomb',
    '💣 Ghost bomber',
    'Swap a Little Ghost with a Pumpkin Bomb — it drops the bomb on the densest cluster.',
  ),
  comboLevel(
    12,
    'bomb',
    'bomb',
    '🎃 Giant Blast',
    'Swap two Pumpkin Bombs for a Giant Blast — a huge 5×5 explosion!',
  ),
]

/** First-obstacle popups: one-liner + highlight, once per player ever. */
const OBSTACLE_SCRIPTS: readonly TutorialScript[] = [
  {
    id: 'obstacle-cobweb',
    steps: [
      {
        id: 'obstacle-cobweb-intro',
        trigger: { kind: 'obstacle-seen', root: 'cobweb' },
        title: '🕸️ Cobwebs!',
        text: 'Match on a webbed tile to peel the web off.',
        highlight: { kind: 'modifier', root: 'cobweb' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-gravestone',
    steps: [
      {
        id: 'obstacle-gravestone-intro',
        trigger: { kind: 'obstacle-seen', root: 'gravestone' },
        title: '🪦 Gravestones!',
        text: 'They won’t budge — break them with matches right beside them.',
        highlight: { kind: 'modifier', root: 'gravestone' },
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
        title: '🧊 Cursed ice!',
        text: 'Frozen treats can’t move — crack the ice with a match of their colour.',
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
        title: '🔒 A caged treat!',
        text: 'It can’t move until you match its colour and spring the lock.',
        highlight: { kind: 'modifier', root: 'lock' },
        await: { kind: 'seconds', seconds: 4 },
      },
    ],
  },
  {
    id: 'obstacle-slime',
    steps: [
      {
        id: 'obstacle-slime-intro',
        trigger: { kind: 'obstacle-seen', root: 'slime' },
        title: '🟢 Slime!',
        text: 'It creeps every few moves — match beside it to dissolve it.',
        highlight: { kind: 'modifier', root: 'slime' },
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
