export type TextPart = { text: string; isHighlight: boolean }

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'be',
  'we',
  'i',
  'you',
  'it',
  'that',
  'this',
  'as',
  'at',
  'by',
  'from',
  'can',
  'could',
  'should',
  'would',
])

export function computeKeywords(posts: Array<{ content: string }>) {
  const counts = new Map<string, number>()
  for (const p of posts) {
    for (const t of tokenize(p.content)) {
      if (STOPWORDS.has(t)) continue
      if (t.length <= 2) continue
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted.slice(0, 10).map(([w]) => w)
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightTextParts(text: string, keywords: string[]): TextPart[] {
  const active = keywords.filter((k) => k.trim().length > 0)
  if (active.length === 0) return [{ text, isHighlight: false }]

  const re = new RegExp(`(${active.map(escapeRegExp).join('|')})`, 'gi')
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0
    if (idx > last) parts.push({ text: text.slice(last, idx), isHighlight: false })
    parts.push({ text: text.slice(idx, idx + match[0].length), isHighlight: true })
    last = idx + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), isHighlight: false })
  return parts.length ? parts : [{ text, isHighlight: false }]
}

