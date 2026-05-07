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
  latestSpeakerLabel?: string
  latestSpeakerContent?: string
  turnNumber?: number
  aiAttempt?: number
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

function pickNonDuplicate(items: string[], seed: string, recent: string[], dynamicSuffix?: string) {
  const lowerRecent = new Set(recent.map((x) => toSingleLine(x).toLowerCase()))
  for (let i = 0; i < items.length; i++) {
    const idx = (shortHash(seed) + i) % items.length
    const candidate = items[idx]!
    if (!lowerRecent.has(toSingleLine(candidate).toLowerCase())) return candidate
  }
  // 耗尽后，加动态后缀打破重复
  return items[shortHash(seed) % items.length]! + (dynamicSuffix ? ` ${dynamicSuffix}` : '')
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
      const latestSpeakerLabel = input.context?.latestSpeakerLabel?.trim()
      const latestSpeakerContent = toSingleLine(input.context?.latestSpeakerContent ?? '')
      const anchor = topic || prompt || 'the current topic'
      const cjk = hasCjk(`${anchor} ${latestSpeakerContent}`)
      const attempt = input.context?.aiAttempt ?? 0
      const turn = input.context?.turnNumber ?? 0
      const seed = `${speakerLabel}|${anchor}|${latestSpeakerContent}|${turn}|${attempt}|${input.contribution.slice(-80)}`

      const continuePool = cjk
        ? [
            `${speakerLabel}：接着上一位的发言，关键在于把判断落到可验证的具体场景。`,
            `${speakerLabel}：延续刚才的观点，我认为还要补上边界条件，否则结论容易被误用。`,
            `${speakerLabel}：基于上一条发言，我建议给出一个反例来检验结论是否稳健。`,
            `${speakerLabel}：补充一点，前面的看法如果放到极端情况下，可能会得出相反的结论。`,
            `${speakerLabel}：顺着这个思路，我们还需要考虑实际执行时的资源限制和阻力。`,
            `${speakerLabel}：我也认同上一位的看法，不过在定义核心概念时还可以更精准些。`,
          ]
        : [
            `${speakerLabel}: Adding to the previous point, we should ground the claim in one testable scenario.`,
            `${speakerLabel}: I would extend that point by adding boundary conditions so the conclusion is not overgeneralized.`,
            `${speakerLabel}: To continue the previous idea, we should add one counterexample to stress-test the claim.`,
            `${speakerLabel}: As a supplement, if we push the previous logic to the extreme, it might backfire.`,
            `${speakerLabel}: Following that train of thought, we must also consider practical constraints and friction.`,
            `${speakerLabel}: I agree with the previous speaker, but we could define the core concepts more sharply.`,
          ]
      const stancePool = cjk
        ? [
            `${speakerLabel}：关于“${anchor}”，我的看法是先给明确立场，再用证据说明为什么成立。`,
            `${speakerLabel}：围绕“${anchor}”，我更关注结论对下一步行动的实际影响。`,
            `${speakerLabel}：就“${anchor}”而言，最重要的是把观点写成可被反驳也可被验证的判断。`,
            `${speakerLabel}：对于“${anchor}”，我们需要区分表象和本质，不能只看短期效应。`,
            `${speakerLabel}：针对“${anchor}”这个议题，我的立场是必须结合具体业务场景来谈，不能空对空。`,
            `${speakerLabel}：探讨“${anchor}”时，往往被忽略的是不同利益相关者的诉求差异。`,
          ]
        : [
            `${speakerLabel}: On "${anchor}", my view is that a clear stance must be paired with concrete evidence.`,
            `${speakerLabel}: For "${anchor}", the key is explaining the practical consequence of the claim.`,
            `${speakerLabel}: Regarding "${anchor}", a strong point should be both testable and falsifiable.`,
            `${speakerLabel}: When discussing "${anchor}", we need to separate the symptoms from the root cause.`,
            `${speakerLabel}: My stance on "${anchor}" is that it must be evaluated within a specific business context.`,
            `${speakerLabel}: A critical aspect of "${anchor}" that is often overlooked is the divergence of stakeholder interests.`,
          ]
      const pool = latestSpeakerContent ? [...continuePool, ...stancePool] : stancePool
      const suffix = cjk ? `(轮次:${turn})` : `(Turn:${turn})`
      const script = pickNonDuplicate(pool, seed, recentAiLines, suffix)
      return {
        script,
        followUps: ['Can someone provide an example?', 'What is a counterargument?', 'How would we test this claim?'],
      }
    },
  }
}
