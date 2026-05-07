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
      `You are an AI knight speaking in a seminar room app. Style: ${baseProfile.style}. Output JSON only with keys: script (string), followUps (string[]). The script must be 2-3 concise sentences, between 60 and 160 characters, and must move the discussion forward with a fresh, topic-specific angle. Do not quote or restate any recent message. Do not start with phrases like "Building on", "Building upon", or "To build on".`,
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
  if (charCount(cleaned) >= 60 && charCount(cleaned) <= 160) return jsonResponse({ ...result, script: cleaned })

  const compact = await deepseekChatJson<{ script: string }>({
    system: 'Rewrite into 2-3 concise sentences, 60-160 characters, no quotes, no repetition of recent AI lines, and keep topic-specific angle. Output JSON key script.',
    user: [`Original line: ${cleaned}`, recentAiLines.length ? `Avoid overlap:\n${recentAiLines.join('\n')}` : null].filter((v) => !!v).join('\n\n'),
    temperature: 0.3,
  })
  const compactScript = typeof compact?.script === 'string' ? compact.script.replace(/\s+/g, ' ').trim() : ''
  const useCjkFallback = /[\u3400-\u9fff]/.test(topic) || /[\u3400-\u9fff]/.test(prompt)
  const safeScript =
    charCount(compactScript) >= 60 && charCount(compactScript) <= 160
      ? compactScript
      : useCjkFallback
        ? `围绕“${topic || prompt || '当前议题'}”，请给出一个具体情境来验证这个判断，并说明它在什么条件下会失效。`
        : `For "${topic || prompt || 'this topic'}", provide one concrete scenario that supports the claim, then explain when it would fail.`
  return jsonResponse({ ...result, script: safeScript })
}
