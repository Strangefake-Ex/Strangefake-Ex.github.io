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

function uniq(items: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = toSingleLine(item).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
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
      const focus = cleaned.split(/[\s,.;!?，。！？；：]+/g).filter(Boolean).find((t) => t.length >= 2) ?? (cjk ? '主题' : 'point')
      const rewrite = cjk
        ? pickByHash(
            [
              `把“${focus}”写成明确结论，再补一个具体例子，并说明其意义。`,
              `围绕“${focus}”先给判断，再给证据，最后用问题引导回应。`,
              `删掉空泛表达，保留立场、理由和一个可讨论的问题。`,
            ],
            `${cleaned}|${topic}|${focus}`,
          )
        : pickByHash(
            [
              `Turn "${focus}" into a clear claim, add one concrete example, then explain why it matters.`,
              `State your position on "${focus}", support it with evidence, and close with a discussion question.`,
              `Remove vague phrases and keep a crisp claim, one reason, and one invitation to respond.`,
            ],
            `${cleaned}|${topic}|${focus}`,
          )
      const bulletCandidates = cjk
        ? [`聚焦${focus}`, '给出具体例证', '说明影响范围', '提出可讨论问题']
        : [`Focus on ${focus}`, 'Add concrete evidence', 'Clarify the implication', 'End with one question']
      const bulletPoints = uniq(bulletCandidates).slice(0, 3)
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
      const speakerLabel = input.context?.speakerLabel?.trim() || 'AI Knight'
      const recentAiLines = input.context?.recentAiLines ?? []
      const anchor = topic || prompt || null
      const cjk = hasCjk(`${anchor ?? ''}`)
      const seed = `${speakerLabel}|${anchor ?? ''}|${input.contribution.slice(-80)}`
      const pool = cjk
        ? [
            `${speakerLabel}：围绕“${anchor || '当前议题'}”，请给一个能落地的例子并说明结果。`,
            `${speakerLabel}：这个观点在什么边界条件下不成立，请给出反例。`,
            `${speakerLabel}：若要验证该判断，最小可行的检验步骤是什么？`,
            `${speakerLabel}：请说明这条结论对下一步讨论的具体影响。`,
            `${speakerLabel}：同样结论在另一情境下是否成立？请对比说明。`,
            `${speakerLabel}：请把主张拆成“条件-动作-结果”三段再论证。`,
          ]
        : [
            `${speakerLabel}: Give one concrete example for "${anchor || 'this topic'}" and explain the outcome.`,
            `${speakerLabel}: Under which boundary condition does this claim fail? Add one counterexample.`,
            `${speakerLabel}: What is the smallest test we can run to validate this point?`,
            `${speakerLabel}: Explain one practical implication this claim has for our next step.`,
            `${speakerLabel}: Would the same claim hold in a different context? Compare briefly.`,
            `${speakerLabel}: Reframe the argument as condition, action, and result.`,
          ]
      const script = pickNonDuplicate(pool, seed, recentAiLines)
      return {
        script,
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
