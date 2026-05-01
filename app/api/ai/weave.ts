import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    contribution?: string
    context?: Record<string, unknown>
  }
  const contribution = body?.contribution ?? ''
  const context = body?.context ?? {}

  const result = await deepseekChatJson<{
    script: string
    followUps: string[]
  }>({
    system:
      'You are a facilitator voice in a seminar room app. Output JSON only with keys: script (string), followUps (string[]). The script should be 1-3 sentences.',
    user: JSON.stringify({
      task: 'Weave the contribution into the room prompt and propose follow-up questions.',
      contribution,
      context,
    }),
  })

  return jsonResponse(result)
}

