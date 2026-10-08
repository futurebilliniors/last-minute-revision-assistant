import jwt from 'jsonwebtoken'
import { get } from '../db/index.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const COOKIE = 'lmr_token'

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, SECRET, { expiresIn: '30d' })
}

function readToken(req) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  const cookie = req.headers.cookie
  if (!cookie) return null
  const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 3600 * 1000,
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== '1',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE)
}

/** Protects routes. Attaches req.user when a valid token is present. */
export function requireAuth(req, res, next) {
  const token = readToken(req)
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = get('SELECT id, name, email, provider, created_at FROM users WHERE id = ?', [payload.sub])
    if (!user) return res.status(401).json({ error: 'Account not found' })
    req.user = { id: user.id, name: user.name, email: user.email, provider: user.provider }
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' })
  }
}

/** Soft auth: attaches user if present, never rejects. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET)
      const user = get('SELECT id, name, email FROM users WHERE id = ?', [payload.sub])
      if (user) req.user = { id: user.id, name: user.name, email: user.email }
    } catch {
      /* ignore */
    }
  }
  next()
}
