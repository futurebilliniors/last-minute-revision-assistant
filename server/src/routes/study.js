import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { get, run, mapTopic } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { latestExam, getSubjects, getTopics, analyzeExam, regeneratePlan, getQuizzes } from '../services/workspace.js'
import { explainTopic, generateQuestions } from '../services/ai/index.js'

const router = Router()

/** "Study This Now" — the single best next action. */
router.get('/now', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const analyzed = analyzeExam(exam.id, { persist: false })
  const pending = analyzed.topics.filter((t) => t.status !== 'done')
  const next = pending[0] || null
  const subjects = getSubjects(exam.id)
  const subject = next ? subjects.find((s) => s.id === next.subjectId) : null

  res.json({
    topic: next,
    subject: subject?.name ?? null,
    totalPending: pending.length,
    emergency: analyzed.emergency,
    hoursLeft: analyzed.hoursLeft,
    alternatives: pending.slice(1, 4),
  })
})

/**
 * AI REVISION MODE — start a revision session on a topic.
 * Returns the revision sheet plus generated practice questions.
 */
router.post('/topics/:id/start', requireAuth, async (req, res) => {
  const t = get('SELECT * FROM topics WHERE id = ?', [req.params.id])
  if (!t) return res.status(404).json({ error: 'Topic not found' })
  const subject = get('SELECT name FROM subjects WHERE id = ?', [t.subject_id])

  const topic = mapTopic(t)
  const count = Math.min(10, Math.max(5, Number(req.body?.count) || 8))

  try {
    const [sheet, questions] = await Promise.all([
      explainTopic({ topic, subjectName: subject?.name }),
      generateQuestions({ topic, subjectName: subject?.name, count }),
    ])
    res.json({ topic, subject: subject?.name ?? null, sheet, questions: questions.questions, source: questions.source })
  } catch (err) {
    console.error('[study/start]', err)
    res.status(500).json({ error: 'Could not build the revision session. Please retry.' })
  }
})

/** Submit a quiz → updates score, confidence, priority and the plan. */
router.post('/topics/:id/quiz', requireAuth, (req, res) => {
  const t = get('SELECT * FROM topics WHERE id = ?', [req.params.id])
  if (!t) return res.status(404).json({ error: 'Topic not found' })

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
  const questions = Array.isArray(req.body?.questions) ? req.body.questions : []
  if (!questions.length) return res.status(400).json({ errors: { quiz: 'No questions were submitted.' } })

  let correct = 0
  const detail = questions.map((q, i) => {
    const chosen = Number(answers[i])
    const ok = chosen === Number(q.answer)
    if (ok) correct++
    return { q: q.q, chosen, correct: Number(q.answer), ok, why: q.why }
  })

  const total = questions.length
  const accuracy = Math.round((correct / total) * 100)

  // How should the score move the priority?
  const before = t.priority_score
  const beforeConfidence = t.confidence

  // Performance feeds back into previous_score (weighted with history).
  const blended =
    t.previous_score == null ? accuracy : Math.round(t.previous_score * 0.4 + accuracy * 0.6)

  // Confidence auto-adjusts to match demonstrated performance, lightly.
  let confidenceAfter = Math.round(beforeConfidence * 0.55 + accuracy * 0.45)
  confidenceAfter = Math.max(0, Math.min(100, confidenceAfter))

  run('UPDATE topics SET previous_score = ?, confidence = ? WHERE id = ?', [blended, confidenceAfter, t.id])
  run(
    'INSERT INTO quiz_results (id, exam_id, topic_id, total, correct, accuracy, confidence_after, answers) VALUES (?,?,?,?,?,?,?,?)',
    [randomUUID(), t.exam_id, t.id, total, correct, accuracy, confidenceAfter, JSON.stringify(detail)]
  )
  run(
    'INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)',
    [randomUUID(), t.exam_id, t.id, 'quiz', `Quiz ${correct}/${total} (${accuracy}%)`, 0]
  )

  const analyzed = analyzeExam(t.exam_id)
  const updated = analyzed.topics.find((x) => x.id === t.id)
  regeneratePlan(t.exam_id)

  const delta = Math.round((updated.priorityScore - before) * 10) / 10
  const direction = accuracy < 50 ? 'up' : accuracy >= 75 ? 'down' : 'flat'

  let message
  if (accuracy < 50) {
    message = `Poor result (${accuracy}%) — priority increased. This topic needs another pass.`
  } else if (accuracy >= 75) {
    message = `Strong result (${accuracy}%) — priority reduced. Time is being redirected to weaker topics.`
  } else {
    message = `Solid attempt (${accuracy}%) — priority adjusted slightly. One more pass should secure it.`
  }

  res.json({
    correct,
    total,
    accuracy,
    detail,
    confidenceAfter,
    confidenceBefore: beforeConfidence,
    priority: {
      before,
      after: updated.priorityScore,
      delta,
      level: updated.priorityLevel,
      label: updated.priorityLabel,
      direction,
    },
    message,
    planUpdated: true,
  })
})

/** Quick answer-check used by inline practice questions. */
router.post('/check', requireAuth, (req, res) => {
  const { answer, correct } = req.body || {}
  const ok = Number(answer) === Number(correct)
  res.json({ ok })
})

/** Recent quizzes for the dashboard. */
router.get('/quizzes', requireAuth, (req, res) => {
  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found' })
  const topics = getTopics(exam.id)
  const byId = new Map(topics.map((t) => [t.id, t]))
  res.json({
    quizzes: getQuizzes(exam.id)
      .map((q) => ({ ...q, topicName: byId.get(q.topicId)?.name ?? 'Unknown topic' }))
      .slice(-20),
  })
})

export default router
