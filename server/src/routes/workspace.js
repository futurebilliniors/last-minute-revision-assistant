import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { all, get, run, mapTopic, mapSubject, mapExam } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getExam,
  latestExam,
  getSubjects,
  getTopics,
  loadWorkspace,
  analyzeExam,
  regeneratePlan,
} from '../services/workspace.js'
import { computeReadiness, buildProgressSeries } from '../services/readinessEngine.js'
import { getQuizzes, getProgress, getPlan } from '../services/workspace.js'
import { createExamFromPayload } from '../services/setupService.js'

const router = Router()

const SUBJECT_COLORS = ['#3563f5', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444']

const pad = (n) => String(n).padStart(2, '0')

/** Validate the setup wizard payload. */
function validateSetup(body) {
  const errors = {}
  if (!body.studentName || String(body.studentName).trim().length < 2)
    errors.studentName = 'Tell us who is studying.'
  if (!body.examName || String(body.examName).trim().length < 2) errors.examName = 'Give your exam a name.'
  if (!body.examDate) errors.examDate = 'Pick the exam date.'
  else {
    const d = new Date(`${body.examDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) errors.examDate = 'That date is not valid.'
  }
  if (!body.examTime) errors.examTime = 'Pick the exam start time.'
  const hpd = Number(body.hoursPerDay)
  if (!Number.isFinite(hpd) || hpd < 0.5 || hpd > 16) errors.hoursPerDay = 'Between 0.5 and 16 hours per day.'
  const sess = Number(body.sessionLengthMin)
  if (!Number.isFinite(sess) || sess < 15 || sess > 180) errors.sessionLengthMin = 'Sessions must be 15–180 minutes.'
  const brk = Number(body.breakDurationMin)
  if (!Number.isFinite(brk) || brk < 0 || brk > 90) errors.breakDurationMin = 'Breaks must be 0–90 minutes.'
  if (!Array.isArray(body.subjects) || body.subjects.length === 0) errors.subjects = 'Add at least one subject.'
  return errors
}

/** Create exam + subjects + topics atomically (the setup wizard). */
router.post('/setup', requireAuth, (req, res) => {
  const body = req.body || {}
  const errors = validateSetup(body)
  if (Object.keys(errors).length) return res.status(400).json({ errors })

  const subjectErrors = body.subjects.some((s) => !String(s.name || '').trim())
  if (subjectErrors) return res.status(400).json({ errors: { subjects: 'Every subject needs a name.' } })

  const badTopic = body.subjects
    .flatMap((s) => s.topics || [])
    .find((t) => !String(t.name || '').trim())
  if (badTopic) return res.status(400).json({ errors: { topics: 'Every topic needs a name.' } })

  const { examId, topics } = createExamFromPayload(req.user.id, body)
  res.status(201).json({ examId, subjects: body.subjects.length, topics })
})

function normalizeEnum(v, allowed, dflt) {
  const s = String(v || '').toLowerCase()
  return allowed.includes(s) ? s : dflt
}
function clamp(v, lo, hi, dflt) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}

/** Full app state. */
router.get('/workspace', requireAuth, (req, res) => {
  const data = loadWorkspace(req.user.id)
  res.json(data)
})

/** Replace setup details for the existing exam. */
router.put('/exam', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const body = req.body || {}
  const errors = validateSetup({ ...exam, ...body, subjects: body.subjects || [{ name: 'x' }] })
  delete errors.subjects
  if (Object.keys(errors).length) return res.status(400).json({ errors })

  run(
    `UPDATE exams SET student_name=?, exam_name=?, exam_date=?, exam_time=?, hours_per_day=?,
      session_length_min=?, break_duration_min=?, study_start_time=?, goal_type=?, updated_at=datetime('now')
     WHERE id=?`,
    [
      String(body.studentName).trim(),
      String(body.examName).trim(),
      body.examDate,
      body.examTime,
      Number(body.hoursPerDay),
      Number(body.sessionLengthMin),
      Number(body.breakDurationMin),
      body.studyStartTime || exam.studyStartTime,
      normalizeEnum(body.goalType ?? exam.goalType, ['exam', 'placement'], 'exam'),
      exam.id,
    ]
  )
  res.json({ ok: true })
})

/** Add topics to an existing subject. */
router.post('/subjects/:id/topics', requireAuth, (req, res) => {
  const subject = get('SELECT * FROM subjects WHERE id = ?', [req.params.id])
  if (!subject) return res.status(404).json({ error: 'Subject not found' })

  const list = Array.isArray(req.body?.topics) ? req.body.topics : [req.body]
  const errors = []
  const created = []
  for (const t of list) {
    if (!t?.name || !String(t.name).trim()) {
      errors.push('Topic name is required.')
      continue
    }
    const id = randomUUID()
    run(
      `INSERT INTO topics (id, subject_id, exam_id, name, difficulty, importance, confidence,
         estimated_minutes, previous_score, notes, position)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, subject.id, subject.exam_id, String(t.name).trim(),
        normalizeEnum(t.difficulty, ['easy', 'medium', 'hard'], 'medium'),
        normalizeEnum(t.importance, ['low', 'medium', 'high'], 'medium'),
        clamp(t.confidence, 0, 100, 50),
        clamp(t.estimatedMinutes, 5, 300, 45),
        t.previousScore === null || t.previousScore === undefined || t.previousScore === ''
          ? null : clamp(t.previousScore, 0, 100, null),
        t.notes ? String(t.notes).slice(0, 2000) : null,
        getTopics(subject.exam_id).length,
      ]
    )
    created.push(mapTopic(get('SELECT * FROM topics WHERE id = ?', [id])))
  }

  if (created.length) regeneratePlan(subject.exam_id)
  if (errors.length) return res.status(400).json({ errors: { topics: errors[0] } })
  res.status(201).json({ topics: created })
})

router.post('/subjects', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ errors: { name: 'Subject name is required.' } })
  const id = randomUUID()
  const position = getSubjects(exam.id).length
  run('INSERT INTO subjects (id, exam_id, name, color, position) VALUES (?,?,?,?,?)', [
    id, exam.id, name, SUBJECT_COLORS[position % SUBJECT_COLORS.length], position,
  ])
  res.status(201).json({ subject: mapSubject(get('SELECT * FROM subjects WHERE id = ?', [id])) })
})

router.delete('/topics/:id', requireAuth, (req, res) => {
  const t = get('SELECT * FROM topics WHERE id = ?', [req.params.id])
  if (!t) return res.status(404).json({ error: 'Topic not found' })
  run('DELETE FROM study_sessions WHERE topic_id = ?', [t.id])
  run('DELETE FROM topics WHERE id = ?', [t.id])
  regeneratePlan(t.exam_id)
  res.json({ ok: true })
})

/** Mark a topic revised. */
router.post('/topics/:id/complete', requireAuth, (req, res) => {
  const t = get('SELECT * FROM topics WHERE id = ?', [req.params.id])
  if (!t) return res.status(404).json({ error: 'Topic not found' })

  const done = t.status === 'done'
  run('UPDATE topics SET status = ? WHERE id = ?', [done ? 'pending' : 'done', t.id])
  run(
    'INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)',
    [randomUUID(), t.exam_id, t.id, done ? 'reopened' : 'completed', t.name, done ? 0 : t.estimated_minutes]
  )
  if (!done) run('UPDATE study_sessions SET status = ? WHERE topic_id = ? AND status = ?', ['done', t.id, 'pending'])

  regeneratePlan(t.exam_id)
  res.json({ ok: true, status: done ? 'pending' : 'done' })
})

/** Re-rate confidence after a revision session (feeds back into priority). */
router.post('/topics/:id/confidence', requireAuth, (req, res) => {
  const t = get('SELECT * FROM topics WHERE id = ?', [req.params.id])
  if (!t) return res.status(404).json({ error: 'Topic not found' })
  const raw = Number(req.body?.confidence)
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
    return res.status(400).json({ errors: { confidence: 'Confidence must be between 0 and 100.' } })
  }
  const value = Math.round(raw)

  run('UPDATE topics SET confidence_before = COALESCE(confidence_before, ?), confidence = ? WHERE id = ?', [
    t.confidence, value, t.id,
  ])
  run('INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)', [
    randomUUID(), t.exam_id, t.id, 'confidence', `Confidence ${t.confidence}% → ${value}%`, 0,
  ])

  const before = t.priority_score
  const analyzed = analyzeExam(t.exam_id)
  const after = analyzed.topics.find((x) => x.id === t.id)
  regeneratePlan(t.exam_id)

  res.json({
    ok: true,
    confidence: value,
    priority: { before, after: after?.priorityScore, level: after?.priorityLevel },
    changed: after && Math.abs(after.priorityScore - before) >= 1,
  })
})

/** Readiness with a written explanation. */
router.get('/readiness', requireAuth, (_req, res) => {
  const exam = latestExam(_req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const data = loadWorkspace(_req.user.id)
  res.json(data.readiness)
})

/** Charts + history for the progress page. */
router.get('/progress', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })

  const quizzes = getQuizzes(exam.id)
  const progress = getProgress(exam.id)
  const topics = getTopics(exam.id)
  const subjects = getSubjects(exam.id)

  const bySubject = subjects.map((s) => {
    const list = topics.filter((t) => t.subjectId === s.id)
    const done = list.filter((t) => t.status === 'done')
    const conf = list.length ? Math.round(list.reduce((a, t) => a + t.confidence, 0) / list.length) : 0
    const scored = list.filter((t) => t.previousScore != null)
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      total: list.length,
      completed: done.length,
      percent: list.length ? Math.round((done.length / list.length) * 100) : 0,
      confidence: conf,
      avgScore: scored.length ? Math.round(scored.reduce((a, t) => a + t.previousScore, 0) / scored.length) : null,
    }
  })

  const accuracyTrend = buildProgressSeries(quizzes, progress)

  res.json({
    bySubject,
    quizzes,
    history: progress,
    accuracyTrend,
    totals: {
      completed: topics.filter((t) => t.status === 'done').length,
      total: topics.length,
      quizAttempts: quizzes.length,
      avgAccuracy: quizzes.length
        ? Math.round(quizzes.reduce((a, q) => a + q.accuracy, 0) / quizzes.length)
        : null,
      minutesTracked: progress.reduce((a, p) => a + p.minutes, 0),
    },
  })
})

/** Account summary for the corner profile menu (identity + plan/activity counts). */
router.get('/profile', requireAuth, (req, res) => {
  const user = get('SELECT id, name, email, provider, created_at FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(404).json({ error: 'Account not found' })

  const rows = all(
    'SELECT id, exam_name, goal_type, exam_date, exam_time, created_at FROM exams WHERE user_id = ? ORDER BY created_at DESC',
    [user.id]
  )
  const scope = 'WHERE exam_id IN (SELECT id FROM exams WHERE user_id = ?)'

  const count = (sql, fallback = 0) => {
    const row = get(sql, [user.id])
    const value = row ? Object.values(row)[0] : null
    return value == null ? fallback : Number(value)
  }

  const topics = get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done FROM topics ${scope}`, [user.id])
  const sessions = get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done FROM study_sessions ${scope}`, [user.id])
  const quizzes = get(`SELECT COUNT(*) AS total, AVG(accuracy) AS avg FROM quiz_results ${scope}`, [user.id])

  const stats = {
    subjects: count(`SELECT COUNT(*) FROM subjects ${scope}`),
    topics: Number(topics?.total || 0),
    topicsDone: Number(topics?.done || 0),
    sessions: Number(sessions?.total || 0),
    sessionsDone: Number(sessions?.done || 0),
    quizzes: Number(quizzes?.total || 0),
    avgAccuracy: quizzes?.avg == null ? null : Math.round(Number(quizzes.avg)),
    minutes: count(`SELECT COALESCE(SUM(minutes), 0) FROM revision_progress ${scope}`),
    events: count(`SELECT COUNT(*) FROM revision_progress ${scope}`),
  }

  const current = rows[0] ? mapExam(get('SELECT * FROM exams WHERE id = ?', [rows[0].id])) : null
  let readiness = null
  if (current) {
    try {
      readiness = loadWorkspace(user.id).readiness || null
    } catch {
      readiness = null
    }
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email, provider: user.provider, memberSince: user.created_at },
    plans: {
      total: rows.length,
      exam: rows.filter((r) => r.goal_type !== 'placement').length,
      placement: rows.filter((r) => r.goal_type === 'placement').length,
      current,
      history: rows.map((r) => ({ id: r.id, name: r.exam_name, goalType: r.goal_type, date: r.exam_date })),
    },
    stats,
    readiness,
  })
})

export default router
