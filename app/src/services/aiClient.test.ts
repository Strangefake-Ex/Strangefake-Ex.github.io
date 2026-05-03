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

  test('fallback weaveContribution references topic or prompt when provided', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.weaveContribution({
      contribution: 'Alice: I think we should consider edge cases.',
      context: { topic: 'Testing culture', prompt: 'How should we discuss responsibly?' },
    })
    expect(res.script.includes('Testing culture') || res.script.includes('How should we discuss responsibly?')).toBe(true)
  })
})
