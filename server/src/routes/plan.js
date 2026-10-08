import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { get, run } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { latestExam, getPlan, regeneratePlan, analyzeExam } from '../services/workspace.js'
import { hoursUntilExam } from '../services/priorityEngine.js'

const router = Router()

/** Current plan (regenerating if missing or stale). */
router.get('/', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })

  let plan = getPlan(exam.id)
  const hoursLeft = hoursUntilExam(exam)

  // Auto-generate on first visit and auto-refresh if the exam moved.
  if (!plan || req.query.force === '1') {
    const out = regeneratePlan(exam.id)
    plan = out ? out.plan : null
  }

  res.json({ plan, hoursLeft: Math.round(hoursLeft * 10) / 10 })
})

/** Force a rebuild — also returns why things were re-ordered. */
router.post('/regenerate', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const out = regeneratePlan(exam.id)
  res.json({ plan: out?.plan ?? null, changed: true })
})

/** Mark one scheduled block as done. */
router.post('/sessions/:id/complete', requireAuth, (req, res) => {
  const row = get('SELECT * FROM study_sessions WHERE id = ?', [req.params.id])
  if (!row) return res.status(404).json({ error: 'Session not found' })

  const next = row.status === 'done' ? 'pending' : 'done'
  run('UPDATE study_sessions SET status = ? WHERE id = ?', [next, row.id])

  if (next === 'done' && row.topic_id) {
    run(
      'INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)',
      [
        randomUUID(),
        row.exam_id,
        row.topic_id,
        'session',
        `Completed block: ${row.title}`,
        Math.round((new Date(row.end_at) - new Date(row.start_at)) / 60000),
      ]
    )
  }
  res.json({ ok: true, status: next })
})

/** Explain the plan: why each block exists, and what was skipped. */
router.get('/explanation', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const analyzed = analyzeExam(exam.id, { persist: false })
  const plan = getPlan(exam.id)

  res.json({
    emergency: analyzed.emergency,
    hoursLeft: analyzed.hoursLeft,
    counts: analyzed.counts,
    order: analyzed.topics.slice(0, 8).map((t) => ({
      id: t.id,
      name: t.name,
      score: t.priorityScore,
      level: t.priorityLevel,
      label: t.priorityLabel,
      reason: t.priorityReason,
      minutes: t.recommendedMinutes,
      signals: t.signals,
    })),
    skipped: plan?.sessions?.length ? analyzed.skippable : analyzed.skippable,
    stats: plan?.stats ?? null,
  })
})

export default router
