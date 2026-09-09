import { unlockAudio } from '@gamiq/shared'
import type { GameEvent, Pos } from '@gamiq/swap3/types'
import { TutorialCore, type TutorialHost, type TutorialWorld } from './core.ts'
import type { TutorialScript } from './types.ts'

/**
 * DOM shell around the pure `TutorialCore` (ticket GiftGlitch-a5d77f). Re-renders
 * whenever the core's version bumps: a blocking `.glitch-overlay` panel for
 * `tap` awaits ("Got it!" / "Skip"), and a non-blocking toast pinned above
 * the safe-area inset for everything else — the player keeps playing while a
 * toast is up, so teaching never interrupts a move in progress.
 *
 * Styles are injected once from here so the tutorial owns its CSS without
 * touching the shared stylesheet. Mount the layer *before* the play screen's
 * overlay element so pause/result panels stack above tutorial UI.
 */

const STYLE_ID = 'glitch-tutorial-styles'

const STYLES = /* css */ `
.glitch-tut-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.glitch-tut-toast {
  position: absolute;
  left: 50%;
  bottom: calc(var(--glitch-sab, 0px) + 18px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: min(360px, calc(100% - 20px));
  animation: glitch-tut-in 0.25s ease;
}

.glitch-tut-card {
  padding: 11px 18px;
  border: 1px solid rgb(139 124 196 / 0.55);
  border-radius: 14px;
  background: rgb(26 16 51 / 0.92);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
  font-size: 14px;
  line-height: 1.35;
  text-align: center;
}

.glitch-tut-card strong {
  display: block;
  margin-bottom: 2px;
  font-size: 15px;
  color: #ffd23f;
}

.glitch-tut-skip {
  pointer-events: auto;
  padding: 5px 14px;
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: 999px;
  background: rgb(11 14 20 / 0.6);
  color: rgb(230 233 242 / 0.75);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.glitch-tut-skip:active {
  background: rgb(255 255 255 / 0.12);
}

@keyframes glitch-tut-in {
  from {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
}
`

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES
  document.head.append(style)
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  parent?.append(node)
  return node
}

export class TutorialDirector {
  readonly #core: TutorialCore
  #layer: HTMLElement | undefined
  #renderedVersion = -1

  constructor(world: TutorialWorld, scripts: readonly TutorialScript[], host: TutorialHost) {
    this.#core = new TutorialCore(scripts, host, world)
  }

  /** Mount the tutorial layer under `root`, before `before` for z-order. */
  mount(root: HTMLElement, before?: HTMLElement): void {
    ensureStyles()
    this.#layer = el('div', 'glitch-tut-layer')
    if (before) root.insertBefore(this.#layer, before)
    else root.append(this.#layer)
    this.#sync()
  }

  get highlight(): readonly Pos[] {
    return this.#core.highlight
  }

  get showing(): boolean {
    return this.#core.current !== undefined
  }

  update(dt: number): void {
    this.#core.update(dt)
    this.#sync()
  }

  feed(events: readonly GameEvent[]): void {
    this.#core.feed(events)
    this.#sync()
  }

  settle(): void {
    this.#core.settle()
    this.#sync()
  }

  /** Game over (or leaving the level): close everything, stop rendering. */
  end(): void {
    this.#core.end()
    this.#sync()
  }

  dispose(): void {
    this.#layer?.remove()
    this.#layer = undefined
  }

  #sync(): void {
    const layer = this.#layer
    if (!layer || layer.parentElement === null) return
    if (this.#renderedVersion === this.#core.version) return
    this.#renderedVersion = this.#core.version
    layer.replaceChildren()

    const current = this.#core.current
    if (!current) return
    const { step, blocking } = current

    if (blocking) {
      const overlay = el('div', 'glitch-overlay', layer)
      const panel = el('div', 'glitch-panel', overlay)
      if (step.title) {
        const title = el('h2', 'glitch-panel-title', panel)
        title.textContent = step.title
      }
      const text = el('p', 'glitch-panel-subtitle', panel)
      text.textContent = step.text
      const actions = el('div', 'glitch-actions', panel)
      this.#button(actions, 'Got it!', true, () => this.#core.continueStep())
      this.#button(actions, 'Skip tutorial', false, () => this.#core.skip())
    } else {
      const toast = el('div', 'glitch-tut-toast', layer)
      const card = el('div', 'glitch-tut-card', toast)
      if (step.title) {
        const title = el('strong', undefined, card)
        title.textContent = step.title
      }
      card.append(step.text)
      this.#button(toast, 'Skip tutorial', false, () => this.#core.skip())
    }
  }

  #button(parent: HTMLElement, label: string, primary: boolean, onClick: () => void): void {
    const className = primary ? 'glitch-btn glitch-primary' : 'glitch-tut-skip'
    const button = el('button', className, parent)
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', () => {
      unlockAudio()
      onClick()
      this.#sync()
    })
  }
}
