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
  const latestSpeakerLabel = String((context as Record<string, unknown>)?.latestSpeakerLabel ?? '')
  const latestSpeakerContent = String((context as Record<string, unknown>)?.latestSpeakerContent ?? '')
  const turnNumber = Number((context as Record<string, unknown>)?.turnNumber ?? 0)
  const aiAttempt = Number((context as Record<string, unknown>)?.aiAttempt ?? 0)
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
      `You are an AI knight speaking in a seminar room app. Style: ${baseProfile.style}. Output JSON only with keys: script (string), followUps (string[]). The script must be over 20 characters and at most 180 characters, and should sound natural in dialogue. Content rule: either (A) continue the previous speaker by adding a concrete supplement, or (B) state your own view on the discussion topic. Do not quote or restate recent AI lines. Do not start with phrases like "Building on", "Building upon", or "To build on".`,
    user: [
      `Task: ${speakerLabel} should provide a fresh line for turn ${turnNumber}, attempt ${aiAttempt}.`,
      prompt || topic ? `Prompt: ${prompt}\nTopic: ${topic}` : null,
      latestSpeakerContent ? `Latest speaker: ${latestSpeakerLabel || 'Previous speaker'}\nLatest content: ${latestSpeakerContent}` : null,
      `Recent:\n${contribution.trim() || 'No messages yet.'}`,
      recentAiLines.length ? `Recent AI lines (avoid wording overlap):\n${recentAiLines.join('\n')}` : null,
      `Security: ${security}\nShieldStrength: ${shieldStrength}`,
    ]
      .filter((v) => !!v)
      .join('\n\n'),
    temperature,
  })

  const cleaned = (result.script ?? '').replace(/^(building on|building upon|to build on)\b[^\w]*/i, '').replace(/\s+/g, ' ').trim()
  if (charCount(cleaned) > 20 && charCount(cleaned) <= 180) return jsonResponse({ ...result, script: cleaned })

  const compact = await deepseekChatJson<{ script: string }>({
    system: 'Rewrite into one dialogue-style line, over 20 and <= 250 characters, no quotes, no repeated wording, keep topic-specific angle. Output JSON key script.',
    user: [`Original line: ${cleaned}`, recentAiLines.length ? `Avoid overlap:\n${recentAiLines.join('\n')}` : null].filter((v) => !!v).join('\n\n'),
    temperature: 0.6,
  })
  const compactScript = typeof compact?.script === 'string' ? compact.script.replace(/\s+/g, ' ').trim() : ''
  const useCjkFallback = /[\u3400-\u9fff]/.test(topic) || /[\u3400-\u9fff]/.test(prompt)
  
  const cjkFallbacks = [
    `我接着上一位的观点补充，建议给出一个具体情境并说明这条结论在什么条件下会失效。`,
    `围绕“${topic || prompt || '当前议题'}”，我的看法是先明确立场，再用一个具体例子说明理由。`,
    `顺着这个思路，我们需要考虑实际执行时的资源限制和潜在阻力。`,
    `探讨这个问题时，往往被忽略的是不同利益相关者的诉求差异。`
  ]
  const enFallbacks = [
    `I would continue the previous point by adding one concrete scenario and clarifying when the claim fails.`,
    `On "${topic || prompt || 'this topic'}", my view is to state a clear position and support it with one concrete case.`,
    `Following that train of thought, we must also consider practical constraints and friction.`,
    `A critical aspect that is often overlooked here is the divergence of stakeholder interests.`
  ]
  
  const cjkPrefixes = ['另外，', '退一步讲，', '其实换个角度看，', '或者我们也可以说：', '不可否认的是，']
  const enPrefixes = ['Also, ', 'Taking a step back, ', 'From another angle, ', 'Alternatively, ', 'Admittedly, ']

  const fallbackPool = useCjkFallback ? cjkFallbacks : enFallbacks
  const prefixPool = useCjkFallback ? cjkPrefixes : enPrefixes
  
  // 使用 turnNumber 和 aiAttempt 计算一个简单的哈希索引
  const fallbackIdx = (turnNumber * 7 + aiAttempt * 3) % fallbackPool.length
  const prefixIdx = (turnNumber * 11 + aiAttempt * 5) % prefixPool.length
  
  const fallbackText = `${speakerLabel}：${prefixPool[prefixIdx]}${fallbackPool[fallbackIdx]}`

  const safeScript =
    charCount(compactScript) > 20 && charCount(compactScript) <= 250
      ? compactScript
      : fallbackText
      
  return jsonResponse({ ...result, script: safeScript })
}
