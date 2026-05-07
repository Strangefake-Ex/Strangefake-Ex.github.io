import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

function charCount(text: string) {
  return Array.from(text).length
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    text?: string
    context?: Record<string, unknown>
  }
  const text = body?.text ?? ''
  const context = body?.context ?? {}
  const security = String((context as Record<string, unknown>)?.security ?? 'guarded')
  const shieldStrength = Number((context as Record<string, unknown>)?.shieldStrength ?? 78)
  const prompt = String((context as Record<string, unknown>)?.prompt ?? '')
  const topic = String((context as Record<string, unknown>)?.topic ?? '')

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  const baseProfile =
    security === 'fortified'
      ? { temperature: 0.2, style: 'safety-first, very careful, formal, and concise', intensity: 'moderate edits' as const }
      : security === 'open'
        ? { temperature: 0.75, style: 'expressive while staying respectful; preserve the writer voice', intensity: 'substantial rewrite' as const }
        : { temperature: 0.5, style: 'balanced, clear, and respectful', intensity: 'moderate edits' as const }
  const temperature = clamp(baseProfile.temperature + (50 - clamp(shieldStrength, 0, 100)) / 500, 0.1, 0.9)

  if (!text.trim()) {
    return jsonResponse({ rewrite: 'Draft something first, then ask the AI to polish it.', tone: 'academic', bulletPoints: [] })
  }

  const result = await deepseekChatJson<{
    rewrite: string
    tone: 'academic' | 'neutral' | 'gentle'
    bulletPoints: string[]
  }>({
    system:
      `You rewrite a student draft for a seminar room app. Safety profile: ${baseProfile.style}. Rewrite intensity: ${baseProfile.intensity}. Higher shieldStrength implies stricter politeness and reduced confrontational tone. The rewrite must feel noticeably more polished than the original: tighten wording, add a clearer claim, and make it dialogue-ready. Do not prepend meta phrases like "In response to the prompt". Output JSON only with keys: rewrite (string), tone ("academic"|"neutral"|"gentle"), bulletPoints (string[]). The rewrite must be 2-4 sentences, no line breaks, and should be at least as long as the input draft while staying concise (prefer <= 220 chars). bulletPoints must be exactly 3 concise, draft-specific, non-duplicated action phrases.`,
    user: [
      'Task: Rewrite the draft so it reads like a stronger, more mature contribution to a seminar discussion.',
      baseProfile.intensity === 'moderate edits' ? 'Rules: moderate rephrasing is allowed; keep meaning; improve structure.' : null,
      baseProfile.intensity === 'substantial rewrite' ? 'Rules: you may substantially restructure for clarity and flow; keep meaning; preserve the writer voice.' : null,
      prompt || topic ? `Topic: ${topic}\nPrompt: ${prompt}` : null,
      `Draft:\n${text}`,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  const rewrite = typeof result?.rewrite === 'string' ? result.rewrite.replace(/\s+/g, ' ').trim() : ''
  const sourceLen = charCount(text.replace(/\s+/g, ' ').trim())
  if (rewrite && charCount(rewrite) >= sourceLen && charCount(rewrite) <= 220) return jsonResponse({ ...result, rewrite })

  const expanded = await deepseekChatJson<{ rewrite: string }>({
    system: 'Rewrite into 2-4 concise sentences, no line breaks, preserve meaning, and ensure length is >= source draft length while <= 220 chars. Output JSON key rewrite.',
    user: [
      `Source draft (${sourceLen} chars): ${text}`,
      `Current rewrite: ${rewrite || text}`,
      prompt || topic ? `Topic: ${topic}\nPrompt: ${prompt}` : null,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature: 0.45,
  })
  const compactRewrite = typeof expanded?.rewrite === 'string' ? expanded.rewrite.replace(/\s+/g, ' ').trim() : ''
  const useCjkFallback = /[\u3400-\u9fff]/.test(text) || /[\u3400-\u9fff]/.test(topic) || /[\u3400-\u9fff]/.test(prompt)
  const safeRewrite =
    compactRewrite && charCount(compactRewrite) >= sourceLen && charCount(compactRewrite) <= 220
      ? compactRewrite
      : useCjkFallback
        ? '先明确结论，再补具体例子，最后提出可讨论的问题。'
        : 'State a clear claim, support it with one concrete example, and end with a discussion question.'
  return jsonResponse({ ...result, rewrite: safeRewrite })
}
