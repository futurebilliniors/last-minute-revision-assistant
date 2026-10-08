import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { get, run } from '../db/index.js'
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {}
  const errors = {}
  if (!name || String(name).trim().length < 2) errors.name = 'Please enter your name.'
  if (!email || !EMAIL_RE.test(String(email))) errors.email = 'Enter a valid email address.'
  if (!password || String(password).length < 6) errors.password = 'Password must be at least 6 characters.'
  if (Object.keys(errors).length) return res.status(400).json({ errors })

  const clean = String(email).trim().toLowerCase()
  if (get('SELECT id FROM users WHERE email = ?', [clean])) {
    return res.status(409).json({ errors: { email: 'An account with this email already exists.' } })
  }

  const id = randomUUID()
  const hash = bcrypt.hashSync(String(password), 10)
  run('INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)', [
    id,
    String(name).trim(),
    clean,
    hash,
  ])

  const user = { id, name: String(name).trim(), email: clean }
  setAuthCookie(res, signToken(user))
  res.status(201).json({ user })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ errors: { email: 'Email and password are required.' } })
  }
  const row = get('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()])
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ errors: { password: 'Incorrect email or password.' } })
  }
  const user = { id: row.id, name: row.name, email: row.email }
  setAuthCookie(res, signToken(user))
  res.json({ user })
})

router.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

/**
 * One-click demo access — creates/refreshes the seeded demo account
 * and signs the visitor straight in. Used by the hackathon story.
 */
router.post('/demo', async (_req, res) => {
  try {
    const { seedDemo } = await import('../seed.js')
    const out = seedDemo()
    const row = get('SELECT id, name, email FROM users WHERE id = ?', [out.userId])
    setAuthCookie(res, signToken(row))
    res.json({ user: row })
  } catch (err) {
    console.error('[auth/demo]', err)
    res.status(500).json({ errors: { general: 'Could not load the demo account.' } })
  }
})

export default router
