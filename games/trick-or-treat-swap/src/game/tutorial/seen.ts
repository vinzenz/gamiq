import { loadJSON, saveJSON } from '@gamiq/shared'
import type { TutorialHost } from './core.ts'

/**
 * Seen-tutorial persistence (ticket ToTS-a5d77f): one storage flag set holds
 * both script ids (the whole script was completed or skipped) and step ids
 * (the individual step was shown and dismissed), so a replay resumes a
 * half-seen script where it left off instead of re-teaching from scratch.
 */
const KEY = 'trick-or-treat-swap:tutorial-seen'

function loadSeen(): Record<string, true> {
  return loadJSON(KEY, {})
}

/** Storage-backed `TutorialHost` for the play screen. */
export function storageTutorialHost(): TutorialHost {
  return {
    isSeen: (id) => loadSeen()[id] === true,
    markSeen: (id) => {
      const seen = loadSeen()
      if (seen[id] === true) return
      seen[id] = true
      saveJSON(KEY, seen)
    },
  }
}
