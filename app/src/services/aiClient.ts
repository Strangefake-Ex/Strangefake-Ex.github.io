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
      explainAlert: (input) => postJson<ExplainAlertResult>('/api/ai/explain-alert', input),
      weaveContribution: (input) => postJson<WeaveContributionResult>('/api/ai/weave', input),
    }
  }

  return {
    async rewriteDraft(input) {
      const trimmed = input.text.trim()
      const base = trimmed ? `${trimmed[0]!.toUpperCase()}${trimmed.slice(1)}` : ''
      const rewrite = base
        ? `${base.replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1')}${/[.!?]$/.test(base) ? '' : '.'}`
        : 'Draft something first, then ask the AI to polish it.'
      const bulletPoints = trimmed
        ? ['Clarify your claim in one sentence.', 'Add one piece of evidence or example.', 'End with a question to invite others.']
        : ['Start with a claim.', 'Support it with one example.', 'Ask a follow-up question.']
      return { rewrite, tone: 'academic', bulletPoints }
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
