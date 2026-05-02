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

  const profile =
    security === 'fortified'
      ? { temperature: 0.2, style: 'very careful, safety-first, formal, and concise' }
      : security === 'open'
        ? { temperature: 0.65, style: 'more expressive while staying respectful; preserve the writer voice' }
        : { temperature: 0.4, style: 'balanced, clear, and respectful' }

  if (!text.trim()) {
    return jsonResponse({ rewrite: 'Draft something first, then ask the AI to polish it.', tone: 'academic', bulletPoints: [] })
  }

  const result = await deepseekChatJson<{
    rewrite: string
    tone: 'academic' | 'neutral' | 'gentle'
    bulletPoints: string[]
  }>({
    system:
      `You rewrite a student draft for a seminar room app. Follow the safety profile: ${profile.style}. Higher shieldStrength implies stricter politeness and reduced confrontational tone. Output JSON only with keys: rewrite (string), tone ("academic"|"neutral"|"gentle"), bulletPoints (string[]).`,
    user: JSON.stringify({
      task: 'Rewrite the draft to be clearer and more respectful, keep the meaning, keep it concise.',
      draft: text,
      context: { ...context, shieldStrength },
    }),
    temperature: profile.temperature,
  })

  return jsonResponse(result)
}
