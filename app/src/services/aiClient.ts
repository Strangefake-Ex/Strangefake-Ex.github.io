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
        ? [
            `核心观点：${cleaned}${/[。！？]$/.test(cleaned) ? '' : '。'}`,
            topic ? `围绕“${topic}”，我会把论点落在一个可检验的判断上，而不是停留在泛泛的态度表达。` : '我会把论点落在一个可检验的判断上，而不是停留在泛泛的态度表达。',
            '更进一步，这一点之所以重要，在于它影响我们如何界定问题、权衡利弊，并决定接下来要验证什么。',
            '值得追问的是：哪一个具体例子最能支持（或挑战）这句话？',
          ].join('')
        : [
            `Thesis: ${cleaned}${/[.!?]$/.test(cleaned) ? '' : '.'}`,
            topic
              ? `Framed within “${topic}”, I would tighten the claim into a testable statement and make the reasoning explicit.`
              : 'I would tighten the claim into a testable statement and make the reasoning explicit.',
            'What makes this worth saying is the practical implication: it changes how we interpret the issue and what we should do next.',
            'A good next question is: which concrete example best supports (or challenges) this claim?',
          ].join(' ')

      const bulletPoints = cjk
        ? ['用一句话明确结论与立场。', '补上一个可验证的理由或例子。', '用一个可讨论的问题收束并引导回应。']
        : ['Lead with a one-sentence thesis.', 'Add one concrete reason or example.', 'End with a discussion question.']
      return { rewrite, tone: 'academic', bulletPoints }
    },
    async suggestPrompt(input) {
      const topic = toSingleLine(input.context?.topic ?? input.context?.prompt ?? input.context?.roomTitle ?? '')
      const cjk = hasCjk(topic)
      const label = topic || (cjk ? '当前主题' : 'the current topic')
      const prompt = cjk
        ? `在“${label}”的语境里，挑一个具体场景说明你的立场，并用一个问题邀请他人回应。`
        : `Pick one concrete example related to “${label}”, state a clear position, and end with one question that invites a reply.`
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
      const anchor = topic || prompt || null
      const lastLine = extractLastLine(input.contribution)
      const base = lastLine.trim() || '—'
      const script = `Building on “${base}”${anchor ? ` in our discussion on “${anchor}”` : ''}, I’d add one point: how does this shape our next step or counterexample?`
      return {
        script: limitWords(script, 100),
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
