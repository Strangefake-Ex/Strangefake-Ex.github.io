import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = {
  runtime: 'edge'
}

function charCount(text: string) {
  return Array.from(text).length
}

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
      'You generate a single-sentence writing prompt for a seminar-room app. Output JSON only with key: prompt (string). The prompt must be <= 50 characters, exactly one sentence, no quotes, no markdown, no line breaks, and it must be specific and actionable rather than generic.',
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
  if (charCount(out) <= 50) return jsonResponse({ prompt: out })

  const compact = await deepseekChatJson<{ prompt: string }>({
    system: 'Rewrite to <= 50 characters, one sentence, no line breaks. Output JSON key prompt.',
    user: `Original prompt: ${out}`,
    temperature: 0.2,
  })
  const compactPrompt = typeof compact?.prompt === 'string' ? compact.prompt.replace(/\s+/g, ' ').trim() : ''
  const useCjkFallback = /[\u3400-\u9fff]/.test(anchor)
  const safePrompt = charCount(compactPrompt) <= 50 ? compactPrompt : useCjkFallback ? '先写立场一句，再补一个具体例子。' : 'Write one claim, then add one concrete example.'
  return jsonResponse({ prompt: safePrompt })
}
