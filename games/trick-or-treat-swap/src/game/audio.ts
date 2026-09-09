import { tone } from '@gamiq/shared'

/**
 * All game audio as tiny synth blips on the shared `tone()` helper — no audio
 * assets to ship, no unlocking beyond the usual first-gesture `unlockAudio()`.
 * Volumes are kept low; phone speakers distort easily.
 */
const tri = (freq: number, dur: number, when = 0, volume = 0.1) => {
  tone(freq, dur, { type: 'triangle', volume, when })
}

/** Quick rising arpeggio. */
const arp = (freqs: readonly number[], step: number, dur: number, volume: number) => {
  freqs.forEach((freq, i) => {
    tri(freq, dur, i * step, volume)
  })
}

export const sfx = {
  select: () => tri(680, 0.05, 0, 0.06),
  swap: () => {
    tri(520, 0.06)
    tri(660, 0.07, 0.05)
  },
  reject: () => tone(140, 0.16, { type: 'square', volume: 0.05 }),
  pop: (depth: number, count: number) => {
    const base = 430 + depth * 80
    tri(base, 0.09, 0, 0.1)
    if (count >= 5) tri(base * 1.5, 0.12, 0.05, 0.08)
    if (count >= 8) tri(base * 2, 0.16, 0.1, 0.07)
  },
  convert: () => {
    tri(523, 0.07)
    tri(659, 0.07, 0.06)
    tri(784, 0.12, 0.12)
  },
  combo: () => arp([392, 523, 659, 784, 1046], 0.05, 0.09, 0.09),
  bomb: () => {
    tone(75, 0.5, { type: 'sawtooth', volume: 0.2 })
    tone(120, 0.25, { type: 'square', volume: 0.08, when: 0.02 })
    tri(50, 0.6, 0.05, 0.14)
  },
  broom: () => arp([300, 420, 560, 720], 0.035, 0.06, 0.07),
  cauldron: () => {
    // Shimmering pentatonic swirl, slightly detuned per note.
    ;[660, 784, 880, 1046, 1318].forEach((note, i) => {
      tri(note * (0.98 + Math.random() * 0.04), 0.08, i * 0.045, 0.06)
    })
  },
  blue: () => {
    tri(760, 0.1, 0, 0.07)
    tri(980, 0.14, 0.09, 0.07)
  },
  fuse: () => tri(1200, 0.05, 0, 0.04),
  hit: () => tone(230, 0.07, { type: 'square', volume: 0.05 }),
  break: () => {
    tone(170, 0.12, { type: 'square', volume: 0.08 })
    tone(90, 0.2, { type: 'square', volume: 0.07, when: 0.06 })
  },
  spread: () => tone(110, 0.28, { type: 'sawtooth', volume: 0.05 }),
  deliver: () => {
    tri(784, 0.07, 0, 0.09)
    tri(1046, 0.12, 0.07, 0.09)
  },
  shuffle: () => arp([330, 415, 494, 587, 660], 0.03, 0.05, 0.05),
  cascade: (depth: number) => tri(500 + depth * 90, 0.14, 0, 0.06),
  win: () => {
    arp([523, 659, 784, 1046], 0.11, 0.14, 0.11)
    tri(1318, 0.4, 0.48, 0.09)
  },
  lose: () => arp([392, 311, 262], 0.18, 0.25, 0.09),
}
