/**
 * Tiny API client.
 * - Uses the cookie session set by the server (credentials: include).
 * - Never touches an API key: all AI calls go through /api/ai on the server.
 * - Normalises errors into { errors } / { error } the UI can render.
 */

class ApiError extends Error {
  constructor(message, errors = null, status = 500) {
    super(message)
    this.errors = errors
    this.status = status
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check that it is running, then retry.')
  }

  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON response */
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed (${res.status})`,
      data.errors || null,
      res.status
    )
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}

export { ApiError }
