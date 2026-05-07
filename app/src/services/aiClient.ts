export type AiClientMode = 'stub' | 'http'

export type AiContext = {
  roomId?: string
  roomTitle?: string
  prompt?: string
  topic?: string
  mode?: string
  security?: string
  shieldStrength?: number
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

function limitWords(text: string, maxWords: number) {
  const tokens = text.trim().split(/\s+/g).filter(Boolean)
  if (tokens.length <= maxWords) return text.trim()
  return `${tokens.slice(0, maxWords).join(' ')}…`
}

function extractLastLine(contribution: string) {
  const lines = contribution
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    if (!/^topic:/i.test(line) && !/^prompt:/i.test(line) && !/^recent messages:/i.test(line)) return line
  }
  return contribution.trim()
}

function hasCjk(text: string) {
  return /[\u3400-\u9fff]/.test(text)
}

function toSingleLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function limitChars(text: string, maxChars: number) {
  const chars = Array.from(text)
  if (chars.length <= maxChars) return text
  return chars.slice(0, maxChars).join('')
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

      const rewriteRaw = cjk
        ? topic
          ? `围绕“${topic}”，${cleaned}。举一例说明？`
          : `${cleaned}。举一例说明？`
        : topic
          ? `${cleaned}. What example supports this on “${topic}”?`
          : `${cleaned}. What example supports this?`

      const bulletPoints = cjk
        ? ['一句话结论', '补一个例子', '抛出问题']
        : ['Clear thesis', 'Add one example', 'Ask a question']
      return { rewrite: limitChars(rewriteRaw, 50), tone: 'academic', bulletPoints }
    },
    async suggestPrompt(input) {
      const topic = toSingleLine(input.context?.topic ?? input.context?.prompt ?? input.context?.roomTitle ?? '')
      const cjk = hasCjk(topic)
      const label = topic || (cjk ? '当前主题' : 'the current topic')
      const promptRaw = cjk
        ? `就“${label}”写一句结论，再补一个例子。`
        : `State a clear claim about “${label}” and add one example.`
      return { prompt: limitChars(promptRaw, 50) }
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
      const anchor = topic || prompt || null
      const cjk = hasCjk(String(anchor ?? ''))
      const scriptRaw = cjk
        ? anchor
          ? `关于“${anchor}”，你能给一个具体例子吗？`
          : '你能给一个具体例子吗？'
        : anchor
          ? `On “${anchor}”, what concrete example supports your point?`
          : 'What concrete example supports your point?'
      return {
        script: limitChars(limitWords(scriptRaw, 50), 50),
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
