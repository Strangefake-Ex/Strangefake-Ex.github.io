import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

function limitWords(text: string, maxWords: number) {
  const tokens = text.trim().split(/\s+/g).filter(Boolean)
  if (tokens.length <= maxWords) return text.trim()
  return `${tokens.slice(0, maxWords).join(' ')}…`
}

function limitChars(text: string, maxChars: number) {
  const chars = Array.from(text)
  if (chars.length <= maxChars) return text
  return chars.slice(0, maxChars).join('')
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
      `You are an AI knight speaking in a seminar room app. Style: ${baseProfile.style}. Output JSON only with keys: script (string), followUps (string[]). The script must be 1 sentence, must be <= 50 characters, must connect to the prompt/topic when available, and must add a new point without quoting or restating any recent message. Do not start with phrases like "Building on", "Building upon", or "To build on".`,
    user: [
      'Task: Provide one concise, dialogue-like sentence that moves the discussion forward without repeating what someone already said.',
      prompt || topic ? `Prompt: ${prompt}\nTopic: ${topic}` : null,
      `Recent:\n${contribution.trim() || 'No messages yet.'}`,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  const cleaned = limitWords(result.script ?? '', 50).replace(/^(building on|building upon|to build on)\b[^\w]*/i, '').replace(/\s+/g, ' ').trim()
  return jsonResponse({ ...result, script: limitChars(cleaned, 50) })
}
