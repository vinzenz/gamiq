const PREFIX = 'gamiq:'

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode); best-effort only.
  }
}

export function loadBest(key: string): number {
  return loadJSON(`${key}:best`, 0)
}

/** Persists `score` if it beats the stored best. Returns the best and whether it improved. */
export function updateBest(key: string, score: number): { best: number; improved: boolean } {
  const best = loadBest(key)
  if (score > best) {
    saveJSON(`${key}:best`, score)
    return { best: score, improved: true }
  }
  return { best, improved: false }
}
