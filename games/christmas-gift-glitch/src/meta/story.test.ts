import { equal, match } from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STORY, storyFor } from './story.ts'

describe('Christmas story', () => {
  it('has one child-safe dispatch for every campaign level', () => {
    equal(STORY.length, 40)
    for (const beat of STORY) {
      match(beat.title, /\S/)
      match(beat.body, /\S/)
    }
  })

  it('falls back to the first dispatch for an unknown level', () => {
    equal(storyFor(99), STORY[0])
  })
})
