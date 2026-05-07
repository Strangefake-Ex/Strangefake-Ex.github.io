import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    context?: Record<string, unknown>
  }
  const context = body?.context ?? {}
  const prompt = String((context as Record<string, unknown>)?.prompt ?? '')
  const topic = String((context as Record<string, unknown>)?.topic ?? '')
  const roomTitle = String((context as Record<string, unknown>)?.roomTitle ?? '')
  const security = String((context as Record<string, unknown>)?.security ?? 'guarded')
  const shieldStrength = Number((context as Record<string, unknown>)?.shieldStrength ?? 78)

  const anchor = (topic || prompt || roomTitle).trim()

  const result = await deepseekChatJson<{ prompt: string }>({
    system:
      'You generate a single-sentence writing prompt for a seminar-room app. Output JSON only with key: prompt (string). The prompt must be exactly one sentence, no quotes, no markdown, no line breaks, and it must be specific and actionable rather than generic.',
    user: [
      'Task: Provide one sentence that helps the user write a stronger private draft for the current discussion.',
      anchor ? `Topic/Prompt: ${anchor}` : null,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature: 0.6,
  })

  const out = typeof result?.prompt === 'string' ? result.prompt.replace(/\s+/g, ' ').trim() : ''
  return jsonResponse({ prompt: out })
}

