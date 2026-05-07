import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

function limitWords(text: string, maxWords: number) {
  const tokens = text.trim().split(/\s+/g).filter(Boolean)
  if (tokens.length <= maxWords) return text.trim()
  return `${tokens.slice(0, maxWords).join(' ')}…`
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    contribution?: string
    context?: Record<string, unknown>
  }
  const contribution = body?.contribution ?? ''
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
      ? { temperature: 0.2, style: 'safety-first, inclusive, low-conflict; avoid sharp claims' }
      : security === 'open'
        ? { temperature: 0.75, style: 'curious, bold, but still respectful; invite disagreement constructively' }
        : { temperature: 0.5, style: 'balanced, facilitative, and grounded' }
  const temperature = clamp(baseProfile.temperature + (50 - clamp(shieldStrength, 0, 100)) / 500, 0.1, 0.9)

  const result = await deepseekChatJson<{
    script: string
    followUps: string[]
  }>({
    system:
      `You are an AI knight speaking in a seminar room app. Style: ${baseProfile.style}. Output JSON only with keys: script (string), followUps (string[]). The script must be 1-3 sentences, must be <= 100 words, must connect to the prompt/topic when available, and must directly continue from at least one line in recent messages (no generic preface). Do not start with phrases like "Building on", "Building upon", or "To build on".`,
    user: [
      'Task: Speak as the current AI knight. In 1-3 sentences, continue the discussion by responding to the latest relevant message and tying it back to the prompt/topic.',
      prompt || topic ? `Prompt: ${prompt}\nTopic: ${topic}` : null,
      `Recent:\n${contribution.trim() || 'No messages yet.'}`,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  const cleaned = limitWords(result.script ?? '', 100).replace(/^(building on|building upon|to build on)\b[^\w]*/i, '').trim()
  return jsonResponse({ ...result, script: cleaned })
}
