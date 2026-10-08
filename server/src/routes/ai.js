import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { latestExam, getTopics, getQuizzes, getPlan, getSubjects, analyzeExam } from '../services/workspace.js'
import { computeReadiness } from '../services/readinessEngine.js'
import { generateTopics, answerCopilot, aiMode } from '../services/ai/index.js'
import { hoursUntilExam } from '../services/priorityEngine.js'

const router = Router()

/** Which AI engine is live (offline demo vs. connected model). */
router.get('/status', requireAuth, (_req, res) => {
  res.json({
    mode: aiMode(),
    provider: aiMode() === 'remote' ? (process.env.AI_PROVIDER || 'openai') : null,
    note:
      aiMode() === 'remote'
        ? 'Connected to a live model. Keys are held on the server only.'
        : 'Running the built-in offline engine — no API key required.',
  })
})

/**
 * "Generate topics using AI" — the student types a subject + syllabus,
 * the engine proposes high-yield topics ready to edit.
 */
router.post('/generate-topics', requireAuth, async (req, res) => {
  const { subjectName = '', syllabus = '', examName = '', count = 8 } = req.body || {}
  if (!String(subjectName).trim()) {
    return res.status(400).json({ errors: { subjectName: 'Enter the subject first.' } })
  }
  try {
    const topics = await generateTopics({
      subjectName: String(subjectName).trim(),
      syllabus: String(syllabus),
      examName: String(examName),
      count: Math.min(20, Math.max(3, Number(count) || 8)),
    })
    res.json({ topics, source: aiMode() })
  } catch (err) {
    console.error('[ai/generate-topics]', err)
    res.status(502).json({ error: 'Topic generation failed. Please try again.' })
  }
})

/**
 * Revision Copilot — answers using the student's real revision data.
 * The data is assembled server-side and never trusted from the client.
 */
router.post('/chat', requireAuth, async (req, res) => {
  const message = String(req.body?.message || '').trim()
  if (!message) return res.status(400).json({ errors: { message: 'Type a question first.' } })
  if (message.length > 2000) return res.status(400).json({ errors: { message: 'Message is too long.' } })

  const exam = latestExam(req.user.id)
  if (!exam) return res.status(404).json({ error: 'No exam found — set up your exam first.' })

  const topics = getTopics(exam.id)
  const quizzes = getQuizzes(exam.id)
  const plan = getPlan(exam.id)
  const hoursLeft = Math.round(hoursUntilExam(exam) * 10) / 10

  const analyzed = analyzeExam(exam.id, { persist: false })
  const subjectMap = new Map(getSubjects(exam.id).map((s) => [s.id, s.name]))
  const nameOf = (t) => subjectMap.get(t.subjectId) || 'General'
  const subjects = [...new Set(analyzed.topics.map(nameOf))]

  const ranked = analyzed.topics
  const pending = ranked.filter((t) => t.status !== 'done')
  const readiness = computeReadiness({
    topics: ranked,
    quizzes,
    exam,
    hoursLeft,
    plannedHours: plan ? plan.stats.totalHours : 0,
  })

  const summary = [
    `STUDENT DATA (authoritative — use only this):`,
    `Goal: ${exam.goalType === 'placement' ? 'placement / interview preparation' : 'exam revision'}.`,
    `${exam.goalType === 'placement' ? 'Target' : 'Exam'}: ${exam.examName} on ${exam.examDate} at ${exam.examTime}.`,
    `Time until ${exam.goalType === 'placement' ? 'the interview/test' : 'exam'}: ${hoursLeft} hours.${analyzed.emergency ? ' EMERGENCY MODE IS ACTIVE (<24h).' : ''}`,
    `Daily study budget: ${exam.hoursPerDay}h · session ${exam.sessionLengthMin}min · break ${exam.breakDurationMin}min.`,
    `Subjects: ${subjects.join(', ') || 'none yet'}.`,
    `Topics: ${ranked.length} total, ${pending.length} remaining, ${ranked.length - pending.length} revised.`,
    `Plan: ${plan ? `${plan.stats.totalSessions} sessions, ${plan.stats.totalHours}h across ${plan.days.length} day(s)` : 'not generated yet'}.`,
    `Quizzes: ${quizzes.length} attempt(s)${
      quizzes.length
        ? `, average accuracy ${Math.round(quizzes.reduce((a, q) => a + q.accuracy, 0) / quizzes.length)}%`
        : ''
    }.`,
    ``,
    `TOPIC RANKINGS (highest priority first):`,
    ...ranked
      .slice(0, 20)
      .map(
        (t) =>
          `- ${t.name} [${nameOf(t)}] score ${t.priorityScore} (${t.priorityLevel}) · ` +
          `conf ${t.confidence}% · imp ${t.importance} · diff ${t.difficulty} · ${t.recommendedMinutes}min · ` +
          `${t.status === 'done' ? 'REVISED' : 'pending'}${t.previousScore != null ? ` · prev ${t.previousScore}%` : ''} · ${t.priorityReason}`
      ),
    ``,
    `Lowest priority / skippable: ${analyzed.skippable.map((t) => t.name).join(', ') || 'none'}.`,
  ].join('\n')

  try {
    const result = await answerCopilot({
      message,
      context: {
        summary,
        topics: ranked,
        plan,
        quizzes,
        hoursLeft,
        emergency: analyzed.emergency,
        readiness,
        goalType: exam.goalType,
      },
    })
    res.json({ reply: result.reply, source: result.source })
  } catch (err) {
    console.error('[ai/chat]', err)
    res.status(502).json({ error: 'The copilot is unavailable right now. Please retry.' })
  }
})

export default router
