import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = {
  runtime: 'edge'
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    alertTitle?: string
    alertDetail?: string
    context?: Record<string, unknown>
  }
  const alertTitle = body?.alertTitle ?? ''
  const alertDetail = body?.alertDetail ?? ''
  const context = body?.context ?? {}

  if (!alertTitle.trim() && !alertDetail.trim()) {
    return jsonResponse({ explanation: 'No alert provided.', evidence: [] })
  }

  const result = await deepseekChatJson<{
    explanation: string
    evidence: string[]
  }>({
    system:
      'You explain an AI safety or fairness alert in a seminar room app. Output JSON only with keys: explanation (string), evidence (string[]). Keep it short and actionable.',
    user: JSON.stringify({
      task: 'Explain the alert and cite brief evidence snippets.',
      alertTitle,
      alertDetail,
      context,
    }),
  })

  return jsonResponse(result)
}

