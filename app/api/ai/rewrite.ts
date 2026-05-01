import { deepseekChatJson, jsonResponse, methodNotAllowed } from './_deepseek'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = (await req.json().catch(() => null)) as null | {
    text?: string
    context?: Record<string, unknown>
  }
  const text = body?.text ?? ''
  const context = body?.context ?? {}

  if (!text.trim()) {
    return jsonResponse({ rewrite: 'Draft something first, then ask the AI to polish it.', tone: 'academic', bulletPoints: [] })
  }

  const result = await deepseekChatJson<{
    rewrite: string
    tone: 'academic' | 'neutral' | 'gentle'
    bulletPoints: string[]
  }>({
    system:
      'You rewrite a student draft for a seminar room app. Output JSON only with keys: rewrite (string), tone ("academic"|"neutral"|"gentle"), bulletPoints (string[]).',
    user: JSON.stringify({
      task: 'Rewrite the draft to be clearer and more respectful, keep the meaning, keep it concise.',
      draft: text,
      context,
    }),
  })

  return jsonResponse(result)
}

