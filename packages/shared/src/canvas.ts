export interface CanvasSize {
  /** Logical CSS-pixel width — draw using these coordinates. */
  width: number
  height: number
  /** Backing-store size (CSS size × device pixel ratio). */
  pixelWidth: number
  pixelHeight: number
}

/**
 * Sizes the canvas backing store to its CSS size × devicePixelRatio (capped
 * for performance) and returns both logical and pixel dimensions.
 * Call on startup and on every viewport resize.
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, maxDpr = 2): CanvasSize {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)
  canvas.width = pixelWidth
  canvas.height = pixelHeight
  return { width, height, pixelWidth, pixelHeight }
}

/** Maps the context so drawing can use logical CSS-pixel coordinates. Call after clearing. */
export function applyCanvasScale(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const cssWidth = canvas.clientWidth || 1
  const cssHeight = canvas.clientHeight || 1
  ctx.setTransform(canvas.width / cssWidth, 0, 0, canvas.height / cssHeight, 0, 0)
}
