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

  test('fallback weaveContribution avoids repeated lines when recent AI lines are provided', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.weaveContribution({
      contribution: 'Alice: I think we should consider edge cases.',
      context: { topic: 'Testing culture', recentAiLines: ['Give one counterexample.'] },
    })
    expect(res.script).not.toBe('Give one counterexample.')
  })

  test('fallback weaveContribution script is topic-aware and longer than trivial one-liners', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.weaveContribution({
      contribution: Array.from({ length: 200 }, (_, i) => `word${i}`).join(' '),
      context: { topic: 'T' },
    })
    expect(res.script.toLowerCase()).toContain('t')
    expect(Array.from(res.script).length).toBeGreaterThan(40)
  })

  test('fallback suggestPrompt returns a single-line hint', async () => {
    const client = createAiClient({ mode: 'stub' })
    const res = await client.suggestPrompt({ context: { topic: 'Testing culture' } })
    expect(res.prompt.length).toBeGreaterThan(0)
    expect(res.prompt.includes('\n')).toBe(false)
  })
})
