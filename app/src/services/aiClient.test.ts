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
    expect(res.rewrite.toLowerCase()).not.toContain('in response to the prompt')
  })

  test('fallback weaveContribution references topic or prompt when provided', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.weaveContribution({
      contribution: 'Alice: I think we should consider edge cases.',
      context: { topic: 'Testing culture', prompt: 'How should we discuss responsibly?' },
    })
    expect(res.script.includes('Testing culture') || res.script.includes('How should we discuss responsibly?')).toBe(true)
  })

  test('fallback weaveContribution script is within 100 words', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.weaveContribution({
      contribution: Array.from({ length: 200 }, (_, i) => `word${i}`).join(' '),
      context: { topic: 'T' },
    })
    const words = res.script.trim().split(/\s+/g).filter(Boolean)
    expect(words.length).toBeLessThanOrEqual(100)
  })

  test('fallback suggestPrompt returns a single-line hint', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.suggestPrompt({ context: { topic: 'Testing culture' } })
    expect(res.prompt.length).toBeGreaterThan(0)
    expect(res.prompt.includes('\n')).toBe(false)
  })
})
