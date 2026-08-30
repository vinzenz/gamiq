/**
 * Screen registry — the app shell's plug-in point.
 *
 * `main.ts` owns the canvas, the rAF loop and one mounted screen at a time.
 * Screens register themselves under an id and the shell (or another screen)
 * navigates to them; the alley map and tutorial screens plug in later with
 * `registerScreen('map', …)` / `registerScreen('tutorial', …)` and become
 * reachable through `host.navigate` (the pause menu already links to `'map'`
 * as soon as one is registered).
 */

export interface ScreenHost {
  canvas: HTMLCanvasElement
  /** DOM layer for a screen's HUD and overlays; emptied between screens. */
  dom: HTMLElement
  /** Tear down the current screen and mount another one. */
  navigate(id: string, params?: unknown): void
  hasScreen(id: string): boolean
}

export interface Screen {
  /** DOM layer (HUD, overlays) mounted under `ScreenHost.dom`, if any. */
  element?: HTMLElement
  update(dt: number): void
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void
  /** Called on startup and on every viewport resize (logical CSS pixels). */
  resize?(width: number, height: number): void
  dispose?(): void
}

type ErasedFactory = (host: ScreenHost, params: unknown) => Screen

const factories = new Map<string, ErasedFactory>()

/**
 * Register a screen under an id. The params type only exists on the
 * `registerScreen` / `navigate` call pair; the map itself erases it, which is
 * the single intentional cast in this file.
 */
export function registerScreen<Params>(
  id: string,
  create: (host: ScreenHost, params: Params) => Screen,
): void {
  factories.set(id, (host, params) => create(host, params as Params))
}

export function hasScreen(id: string): boolean {
  return factories.has(id)
}

export function createScreen(id: string, host: ScreenHost, params: unknown): Screen {
  const create = factories.get(id)
  if (!create) throw new Error(`trick-or-treat-swap: no screen registered as '${id}'`)
  return create(host, params)
}
