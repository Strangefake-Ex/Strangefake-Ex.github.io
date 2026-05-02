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
      const rewrite = trimmed
        ? `In response to the prompt, ${trimmed[0]!.toLowerCase()}${trimmed.slice(1)}`
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
      const base = input.contribution.trim() || '—'
      return {
        script: `Let me pull a thread from the chat: “${base}”. How does this connect to our prompt, and does anyone want to build on it?`,
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
