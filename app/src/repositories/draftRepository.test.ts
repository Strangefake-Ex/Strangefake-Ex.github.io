import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalDraftRepository } from './draftRepository'

describe('draft repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('saves and lists drafts per room & seat', async () => {
    const repo = createLocalDraftRepository(localStorage)
    await repo.upsertDraft({
      roomId: 'r1',
      seatId: 's1',
      text: 'Hello draft',
    })
    const drafts = await repo.listDrafts('r1')
    expect(drafts.length).toBe(1)
    expect(drafts[0]?.text).toBe('Hello draft')
  })
})

