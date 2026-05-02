import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    contribution?: string
    context?: Record<string, unknown>
  }
  const contribution = body?.contribution ?? ''
  const context = body?.context ?? {}
  const security = String((context as Record<string, unknown>)?.security ?? 'guarded')
  const profile =
    security === 'fortified'
      ? { temperature: 0.25, style: 'safety-first, inclusive, low-conflict' }
      : security === 'open'
        ? { temperature: 0.7, style: 'curious, bold, but still respectful' }
        : { temperature: 0.45, style: 'balanced and facilitative' }

  const result = await deepseekChatJson<{
    script: string
    followUps: string[]
  }>({
    system:
      `You are a facilitator voice in a seminar room app. Style: ${profile.style}. Output JSON only with keys: script (string), followUps (string[]). The script should be 1-3 sentences and should reference the prompt/topic when available.`,
    user: JSON.stringify({
      task: 'Weave the contribution into the room prompt and propose follow-up questions.',
      contribution,
      context,
    }),
    temperature: profile.temperature,
  })

  return jsonResponse(result)
}
