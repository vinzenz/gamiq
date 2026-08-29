export interface PointerPoint {
  /** Pointer id — stable while a finger is down, for multi-touch support. */
  id: number
  /** Position relative to the element, in CSS pixels. */
  x: number
  y: number
}

export interface PointerHandlers {
  down?: (point: PointerPoint, event: PointerEvent) => void
  move?: (point: PointerPoint, event: PointerEvent) => void
  up?: (point: PointerPoint, event: PointerEvent) => void
  cancel?: (point: PointerPoint, event: PointerEvent) => void
}

/**
 * Unified touch/mouse/pen input via pointer events. Captures pointers so
 * drags keep tracking outside the element. The element (or an ancestor)
 * needs `touch-action: none` for touch to fire properly.
 * Returns an unsubscribe function.
 */
export function trackPointers(element: HTMLElement, handlers: PointerHandlers): () => void {
  const toPoint = (event: PointerEvent): PointerPoint => {
    const rect = element.getBoundingClientRect()
    return { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const makeListener = (key: keyof PointerHandlers) => (event: PointerEvent) => {
    if (key === 'down') {
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        // Pointer already gone; input still works without capture.
      }
    }
    handlers[key]?.(toPoint(event), event)
  }
  const listeners = {
    down: makeListener('down'),
    move: makeListener('move'),
    up: makeListener('up'),
    cancel: makeListener('cancel'),
  }
  element.addEventListener('pointerdown', listeners.down)
  element.addEventListener('pointermove', listeners.move)
  element.addEventListener('pointerup', listeners.up)
  element.addEventListener('pointercancel', listeners.cancel)
  return () => {
    element.removeEventListener('pointerdown', listeners.down)
    element.removeEventListener('pointermove', listeners.move)
    element.removeEventListener('pointerup', listeners.up)
    element.removeEventListener('pointercancel', listeners.cancel)
  }
}
