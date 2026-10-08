import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspace.js'
import planRoutes from './routes/plan.js'
import studyRoutes from './routes/study.js'
import aiRoutes from './routes/ai.js'
import { seedDemo } from './seed.js'
import { aiMode } from './services/ai/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: true, credentials: true }))

// ----------------------------------------------------------- API routes
// Health must be registered before the workspace router, whose auth
// middleware would otherwise intercept it.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: aiMode(), time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/plan', planRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api', workspaceRoutes)

// --------------------------------------------------------- 404 + errors
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body.' })
  }
  console.error('[unhandled]', err)
  res.status(500).json({ error: 'Something went wrong on our side. Please retry.' })
})

// ---------------------------------------------------- static (production)
const dist = join(__dirname, '..', '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.listen(PORT, () => {
  // Make sure the demo account exists so the story is one click away.
  try {
    seedDemo()
  } catch (err) {
    console.warn('[seed] skipped:', err.message)
  }
  console.log(`\n  Last Minute Revision Assistant`)
  console.log(`  API   → http://localhost:${PORT}/api/health`)
  console.log(`  AI    → ${aiMode() === 'remote' ? `remote (${process.env.AI_PROVIDER})` : 'offline engine (no key required)'}`)
  console.log(`  Demo  → demo@revision.app / demo1234\n`)
})
