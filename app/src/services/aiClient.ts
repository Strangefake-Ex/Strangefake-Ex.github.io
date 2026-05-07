export type AiClientMode = 'stub' | 'http'

export type AiContext = {
  roomId?: string
  roomTitle?: string
  prompt?: string
  topic?: string
  mode?: string
  security?: string
  shieldStrength?: number
  speakerId?: string
  speakerLabel?: string
  recentAiLines?: string[]
}

export type RewriteDraftInput = {
  text: string
  context?: AiContext
}

export type RewriteDraftResult = {
  rewrite: string
  tone: 'academic' | 'neutral' | 'gentle'
  bulletPoints: string[]
}

export type SuggestPromptInput = {
  context?: AiContext
}

export type SuggestPromptResult = {
  prompt: string
}

export type ExplainAlertInput = {
  alertTitle: string
  alertDetail: string
  context?: AiContext
}

export type ExplainAlertResult = {
  explanation: string
  evidence: string[]
}

export type WeaveContributionInput = {
  contribution: string
  context?: AiContext
}

export type WeaveContributionResult = {
  script: string
  followUps: string[]
}

export type AiClient = {
  rewriteDraft: (input: RewriteDraftInput) => Promise<RewriteDraftResult>
  suggestPrompt: (input: SuggestPromptInput) => Promise<SuggestPromptResult>
  explainAlert: (input: ExplainAlertInput) => Promise<ExplainAlertResult>
  weaveContribution: (input: WeaveContributionInput) => Promise<WeaveContributionResult>
}

function hasCjk(text: string) {
  return /[\u3400-\u9fff]/.test(text)
}

function toSingleLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function shortHash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

function pickByHash<T>(items: T[], seed: string) {
  if (items.length === 0) throw new Error('Empty list')
  return items[shortHash(seed) % items.length]!
}

function pickNonDuplicate(items: string[], seed: string, recent: string[]) {
  const lowerRecent = new Set(recent.map((x) => toSingleLine(x).toLowerCase()))
  for (let i = 0; i < items.length; i++) {
    const idx = (shortHash(seed) + i) % items.length
    const candidate = items[idx]!
    if (!lowerRecent.has(toSingleLine(candidate).toLowerCase())) return candidate
  }
  return items[shortHash(seed) % items.length]!
}

export function createAiClient(config: { mode: AiClientMode; baseUrl?: string }): AiClient {
  if (config.mode === 'http') {
    const base = (config.baseUrl ?? '').replace(/\/$/, '')
    async function postJson<T>(path: string, body: unknown): Promise<T> {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`AI API error (${res.status})`)
      return (await res.json()) as T
    }
    return {
      rewriteDraft: (input) => postJson<RewriteDraftResult>('/api/ai/rewrite', input),
      suggestPrompt: (input) => postJson<SuggestPromptResult>('/api/ai/prompt', input),
      explainAlert: (input) => postJson<ExplainAlertResult>('/api/ai/explain-alert', input),
      weaveContribution: (input) => postJson<WeaveContributionResult>('/api/ai/weave', input),
    }
  }

  return {
    async rewriteDraft(input) {
      const trimmed = input.text.trim()
      if (!trimmed) {
        return { rewrite: 'Draft something first, then ask the AI to polish it.', tone: 'academic', bulletPoints: [] }
      }

      const cleaned = toSingleLine(trimmed)
      const topic = toSingleLine(input.context?.topic ?? input.context?.prompt ?? '')
      const cjk = hasCjk(cleaned) || hasCjk(topic)
      const rewrite = cjk
        ? pickByHash(
            ['先给结论，再补一例，再提问。', '观点要具体，理由可验证。', '删空话，保留结论和例子。'],
            `${cleaned}|${topic}`,
          )
        : pickByHash(
            ['State claim, add one example, ask one question.', 'Make one clear claim and one concrete support.', 'Cut vague words; keep claim and evidence.'],
            `${cleaned}|${topic}`,
          )

      const tokens = cleaned.split(/[\s,.;!?，。！？；：]+/g).filter(Boolean)
      const focus = tokens.find((t) => t.length >= 2) ?? (cjk ? '主题' : 'point')
      const bulletPoints = cjk ? [`聚焦${focus}`, '补充例子', '提出追问'] : [`Focus on ${focus}`, 'Add one example', 'Ask one follow-up']
      return { rewrite, tone: 'academic', bulletPoints }
    },
    async suggestPrompt(input) {
      const topic = toSingleLine(input.context?.topic ?? input.context?.prompt ?? input.context?.roomTitle ?? '')
      const cjk = hasCjk(topic)
      const prompt = cjk ? '先写立场一句，再补一个具体例子。' : 'Write one claim, then add one concrete example.'
      return { prompt }
    },
    async explainAlert(input) {
      return {
        explanation: `${input.alertTitle}: ${input.alertDetail}`,
        evidence: [input.context?.prompt ? `Prompt: ${input.context.prompt}` : 'No additional evidence available.'],
      }
    },
    async weaveContribution(input) {
      const topic = input.context?.topic?.trim()
      const prompt = input.context?.prompt?.trim()
      const recentAiLines = input.context?.recentAiLines ?? []
      const anchor = topic || prompt || null
      const cjk = hasCjk(`${anchor ?? ''}`)
      const pool = cjk
        ? ['请给一个反例检验这句判断。', '这个观点的适用边界是什么？', '能补一个具体例子吗？']
        : ['Give one counterexample.', 'When does this claim fail?', 'Add one concrete case.']
      const script = pickNonDuplicate(pool, `${anchor ?? ''}`, recentAiLines)
      return {
        script,
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
