import { describe, expect, test } from 'vitest'

import { createAiClient } from './aiClient'

describe('ai client', () => {
  test('fallback client returns deterministic suggestions without network', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.rewriteDraft({
      text: 'I think this is good',
      context: { roomTitle: 'Room', prompt: 'P' },
    })
    expect(res.rewrite.length).toBeGreaterThan(0)
    expect(res.tone).toBeDefined()
  })
})

