let ctx: AudioContext | undefined

type WindowWithLegacyAudio = Window & { webkitAudioContext?: typeof AudioContext }

function getContext(): AudioContext | undefined {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithLegacyAudio).webkitAudioContext
    if (!Ctor) return undefined
    ctx = new Ctor()
  }
  // Browsers create contexts in a suspended state until a user gesture.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call once from any user-gesture handler so mobile browsers allow sound. */
export function unlockAudio(): void {
  getContext()
}

export interface ToneOptions {
  type?: OscillatorType
  volume?: number
  /** Delay in seconds before the tone starts. */
  when?: number
}

/**
 * Tiny synth blip — good enough for UI and gameplay feedback without shipping
 * audio assets. No-op until audio has been unlocked by a user gesture.
 */
export function tone(freq: number, duration = 0.12, options: ToneOptions = {}): void {
  const audio = getContext()
  if (!audio) return
  const { type = 'sine', volume = 0.15, when = 0 } = options
  const start = audio.currentTime + when
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}
