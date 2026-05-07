import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

function charCount(text: string) {
  return Array.from(text).length
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
  const speakerLabel = String((context as Record<string, unknown>)?.speakerLabel ?? 'AI Knight')
  const recentAiLines = Array.isArray((context as Record<string, unknown>)?.recentAiLines)
    ? ((context as Record<string, unknown>).recentAiLines as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => String(x))
    : []

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
      `You are an AI knight speaking in a seminar room app. Style: ${baseProfile.style}. Output JSON only with keys: script (string), followUps (string[]). The script must be 1 sentence, must be <= 50 characters, and must move the discussion forward with a fresh angle. Do not quote or restate any recent message. Do not start with phrases like "Building on", "Building upon", or "To build on".`,
    user: [
      `Task: ${speakerLabel} should provide one concise sentence with a new angle.`,
      prompt || topic ? `Prompt: ${prompt}\nTopic: ${topic}` : null,
      `Recent:\n${contribution.trim() || 'No messages yet.'}`,
      recentAiLines.length ? `Recent AI lines (avoid wording overlap):\n${recentAiLines.join('\n')}` : null,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  const cleaned = (result.script ?? '').replace(/^(building on|building upon|to build on)\b[^\w]*/i, '').replace(/\s+/g, ' ').trim()
  if (charCount(cleaned) <= 50) return jsonResponse({ ...result, script: cleaned })

  const compact = await deepseekChatJson<{ script: string }>({
    system: 'Rewrite to <= 50 characters, one sentence, no quotes, new angle. Output JSON key script.',
    user: [`Original line: ${cleaned}`, recentAiLines.length ? `Avoid overlap:\n${recentAiLines.join('\n')}` : null].filter((v) => !!v).join('\n\n'),
    temperature: 0.3,
  })
  const compactScript = typeof compact?.script === 'string' ? compact.script.replace(/\s+/g, ' ').trim() : ''
  const useCjkFallback = /[\u3400-\u9fff]/.test(topic) || /[\u3400-\u9fff]/.test(prompt)
  const safeScript = charCount(compactScript) <= 50 ? compactScript : useCjkFallback ? '这个观点的适用边界是什么？' : 'When does this claim fail?'
  return jsonResponse({ ...result, script: safeScript })
}
