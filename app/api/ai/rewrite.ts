import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

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

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  const baseProfile =
    security === 'fortified'
      ? { temperature: 0.2, style: 'safety-first, very careful, formal, and concise', intensity: 'minimal edits' as const }
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
      `You rewrite a student draft for a seminar room app. Safety profile: ${baseProfile.style}. Rewrite intensity: ${baseProfile.intensity}. Higher shieldStrength implies stricter politeness and reduced confrontational tone. Output JSON only with keys: rewrite (string), tone ("academic"|"neutral"|"gentle"), bulletPoints (string[]).`,
    user: [
      'Task: Rewrite the draft to be clearer and more respectful.',
      baseProfile.intensity === 'minimal edits' ? 'Rules: keep wording close; only fix clarity/grammar and soften tone.' : null,
      baseProfile.intensity === 'moderate edits' ? 'Rules: moderate rephrasing is allowed; keep meaning; improve structure.' : null,
      baseProfile.intensity === 'substantial rewrite' ? 'Rules: you may substantially restructure for clarity and flow; keep meaning; preserve the writer voice.' : null,
      `Draft:\n${text}`,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  return jsonResponse(result)
}
