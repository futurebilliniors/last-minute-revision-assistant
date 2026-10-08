/**
 * Remote LLM adapter — SERVER ONLY.
 *
 * Reads AI_PROVIDER / AI_API_KEY / AI_MODEL / AI_BASE_URL from
 * process.env. These are never referenced by any file under /src, so
 * the key cannot end up in the browser bundle.
 *
 * Supports an OpenAI-compatible chat/completions API (which also
 * covers OpenRouter, Groq, Together, etc.) and Anthropic messages.
 */

const provider = () => (process.env.AI_PROVIDER || '').trim().toLowerCase()
const key = () => (process.env.AI_API_KEY || '').trim()

export function hasRemoteProvider() {
  return !!provider() && !!key()
}

export async function remoteComplete(system, user, opts = {}) {
  const p = provider()
  const base = process.env.AI_BASE_URL || (p === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')
  const model = opts.model || process.env.AI_MODEL || (p === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini')

  if (p === 'anthropic') {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 1500,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`anthropic ${res.status}`)
    const data = await res.json()
    return data?.content?.map((c) => c.text || '').join('') ?? ''
  }

  // OpenAI-compatible
  const url = base.replace(/\/$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`openai ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}
