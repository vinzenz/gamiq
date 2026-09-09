import { deepStrictEqual, notStrictEqual, ok, strictEqual, throws } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRng } from './rng.ts'

describe('createRng', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 100 }, () => a.next())
    const seqB = Array.from({ length: 100 }, () => b.next())
    deepStrictEqual(seqA, seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    notStrictEqual(a.next(), b.next())
  })

  it('keeps int() within bounds', () => {
    const rng = createRng(7)
    for (let i = 0; i < 500; i++) {
      const value = rng.int(5)
      ok(value >= 0 && value < 5, `int(5) returned ${value}`)
    }
    for (let i = 0; i < 50; i++) strictEqual(rng.int(1), 0)
  })

  it('pick() only returns elements of the list', () => {
    const rng = createRng(99)
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 100; i++) ok(items.includes(rng.pick(items)))
  })

  it('rejects empty picks and non-positive bounds', () => {
    const rng = createRng(1)
    throws(() => rng.pick([]))
    throws(() => rng.int(0))
  })
})
