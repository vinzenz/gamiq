// Ambient types for Node's built-in test runner (`node --test`), hand-declared
// so the engine tests run with zero extra dependencies. Only the API surface
// the tests actually use is declared.

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void
  export function it(name: string, fn: () => void | Promise<void>): void
}

declare module 'node:assert/strict' {
  export function ok(value: unknown, message?: string): asserts value
  export function equal(actual: unknown, expected: unknown, message?: string): void
  export function notEqual(actual: unknown, expected: unknown, message?: string): void
  export function strictEqual(actual: unknown, expected: unknown, message?: string): void
  export function notStrictEqual(actual: unknown, expected: unknown, message?: string): void
  export function deepStrictEqual(actual: unknown, expected: unknown, message?: string): void
  export function throws(fn: () => unknown, error?: RegExp): void
}
