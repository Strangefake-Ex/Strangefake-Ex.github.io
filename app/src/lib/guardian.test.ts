import { describe, expect, test } from 'vitest'

import { computeKeywords, highlightTextParts } from './guardian'

describe('guardian helpers', () => {
  test('computeKeywords extracts frequent tokens', () => {
    const keywords = computeKeywords([
      { content: 'psychological safety improves safety and learning' },
      { content: 'safety encourages participation' },
    ])
    expect(keywords).toContain('safety')
  })

  test('highlightTextParts splits text around keywords', () => {
    const parts = highlightTextParts('hello safety world', ['safety'])
    expect(parts.some((p) => p.isHighlight && p.text === 'safety')).toBe(true)
  })
})

