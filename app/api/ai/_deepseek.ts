type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function getDeepseekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY')
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'
  return { apiKey, baseUrl, model }
}

export async function deepseekChatJson<T>({
  system,
  user,
  temperature,
}: {
  system: string
  user: string
  temperature?: number
}): Promise<T> {
  const { apiKey, baseUrl, model } = getDeepseekConfig()
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek API error (${res.status}): ${text.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  return JSON.parse(content) as T
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function methodNotAllowed() {
  return jsonResponse({ error: 'Method Not Allowed' }, 405)
}
