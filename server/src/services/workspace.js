/**
 * Shared repository helpers — the single place that knows how to load
 * an exam with its subjects, topics, plan, quizzes and progress.
 */

import { all, get, run, uid, mapTopic, mapSubject, mapExam } from '../db/index.js'
import { analyzeTopics, hoursUntilExam, pickNow } from '../services/priorityEngine.js'
import { buildSchedule, shouldUseEmergency } from '../services/scheduleEngine.js'
import { computeReadiness } from '../services/readinessEngine.js'

export function getExam(examId, userId) {
  const row = userId
    ? get('SELECT * FROM exams WHERE id = ? AND user_id = ?', [examId, userId])
    : get('SELECT * FROM exams WHERE id = ?', [examId])
  return mapExam(row)
}

export function latestExam(userId) {
  const row = get('SELECT * FROM exams WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId])
  return mapExam(row)
}

export function getSubjects(examId) {
  return all('SELECT * FROM subjects WHERE exam_id = ? ORDER BY position, name', [examId]).map(mapSubject)
}

export function getTopics(examId) {
  return all('SELECT * FROM topics WHERE exam_id = ? ORDER BY position, created_at', [examId]).map(mapTopic)
}

export function getQuizzes(examId) {
  return all('SELECT * FROM quiz_results WHERE exam_id = ? ORDER BY created_at', [examId]).map((r) => ({
    id: r.id,
    topicId: r.topic_id,
    examId: r.exam_id,
    total: r.total,
    correct: r.correct,
    accuracy: r.accuracy,
    confidenceAfter: r.confidence_after,
    createdAt: r.created_at,
  }))
}

export function getProgress(examId) {
  return all('SELECT * FROM revision_progress WHERE exam_id = ? ORDER BY created_at', [examId]).map((r) => ({
    id: r.id,
    topicId: r.topic_id,
    event: r.event,
    detail: r.detail,
    minutes: r.minutes,
    createdAt: r.created_at,
  }))
}

const DAY = 864e5
const pad = (n) => String(n).padStart(2, '0')
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function getPlan(examId) {
  const rows = all(
    'SELECT * FROM study_sessions WHERE exam_id = ? ORDER BY position, start_at',
    [examId]
  )
  if (!rows.length) return null

  const topics = getTopics(examId)
  const byId = new Map(topics.map((t) => [t.id, t]))

  const sessions = rows.map((r) => {
    const start = new Date(r.start_at)
    const end = new Date(r.end_at)
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      topicId: r.topic_id,
      startAt: r.start_at,
      endAt: r.end_at,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      dayIndex: r.day_index,
      dayKey: localKey(start),
      position: r.position,
      priority: r.priority,
      reason: r.reason,
      status: r.status,
      mins: Math.max(1, Math.round((end - start) / 60000)),
      subjectId: r.topic_id ? byId.get(r.topic_id)?.subjectId : null,
    }
  })

  const days = []
  for (const s of sessions) {
    let day = days.find((d) => d.key === s.dayKey)
    if (!day) {
      day = { key: s.dayKey, label: dayLabelFor(s.dayKey), sessions: [], studyMinutes: 0 }
      days.push(day)
    }
    day.sessions.push(s)
    if (s.kind !== 'break') day.studyMinutes += s.mins
  }

  const studyMinutes = sessions.filter((s) => s.kind !== 'break').reduce((a, s) => a + s.mins, 0)
  const breakMinutes = sessions.filter((s) => s.kind === 'break').reduce((a, s) => a + s.mins, 0)
  const planned = new Set(sessions.filter((s) => s.kind === 'study' || s.kind === 'quiz' || s.kind === 'practice').map((s) => s.topicId))

  // Topics that never made it into the schedule.
  const skipped = topics
    .filter((t) => t.status !== 'done' && !planned.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      priorityLevel: t.priorityLevel,
      advice:
        t.priorityLevel === 'low'
          ? 'Skipped — low return on time. Revise only if you finish everything else.'
          : 'Ran out of scheduled time — moved to the top of tomorrow.',
    }))

  const exam = getExam(examId)
  const hoursLeft = hoursUntilExam(exam)

  return {
    days,
    sessions,
    skipped,
    stats: {
      totalSessions: sessions.filter((s) => s.kind !== 'break').length,
      studyMinutes,
      breakMinutes,
      totalHours: Math.round((studyMinutes / 60) * 10) / 10,
      topicsPlanned: planned.size,
      topicsSkipped: skipped.length,
      emergency: !!exam?.emergencyMode,
      daysLeft: Math.max(0, Math.ceil(hoursLeft / 24)),
      generatedAt: rows[0].start_at,
    },
  }
}

function dayLabelFor(dateStr, today = new Date()) {
  const t = new Date(`${dateStr}T00:00:00`)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((t - base) / DAY)
  if (diff === 0) return 'TODAY'
  if (diff === 1) return 'TOMORROW'
  return t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Persist refreshed priority scores onto the topics table. */
export function persistPriorities(examId, scored) {
  for (const t of scored) {
    run(
      `UPDATE topics SET priority_score = ?, priority_level = ?, priority_reason = ?, recommended_minutes = ?
       WHERE id = ?`,
      [t.priorityScore, t.priorityLevel, t.priorityReason, t.recommendedMinutes, t.id]
    )
  }
  return scored
}

/** Full analysis pass for an exam. */
export function analyzeExam(examId, { persist = true, now } = {}) {
  const exam = getExam(examId)
  if (!exam) return null
  const topics = getTopics(examId)
  const hoursLeft = hoursUntilExam(exam, now ? new Date(now) : new Date())
  const emergency = shouldUseEmergency(exam, now ? new Date(now) : new Date())

  // Keep emergency state on the exam record so the UI can banner it.
  const em = emergency ? 1 : 0
  if (!!exam.emergencyMode !== emergency) {
    run('UPDATE exams SET emergency_mode = ? WHERE id = ?', [em, exam.id])
    exam.emergencyMode = emergency
  }

  const analyzed = analyzeTopics(topics, exam, { hoursLeft, emergency })
  if (persist) persistPriorities(examId, analyzed.topics)
  analyzed.exam = exam
  return analyzed
}

/** Regenerate and store the schedule. */
export function regeneratePlan(examId, now) {
  const analyzed = analyzeExam(examId, { now })
  if (!analyzed) return null
  run('DELETE FROM study_sessions WHERE exam_id = ?', [examId])
  const plan = buildSchedule(analyzed, analyzed.exam, { now })
  plan.sessions.forEach((s, i) => {
    run(
      `INSERT INTO study_sessions
       (id, exam_id, topic_id, kind, title, start_at, end_at, day_index, position, priority, reason, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [uid(), examId, s.topicId ?? null, s.kind, s.title, s.startAt, s.endAt, s.dayIndex, i, s.priority ?? null, s.reason ?? null]
    )
  })
  // Stash skip advice on the topics that did not fit — the plan view
  // computes its own deferred list, so just annotate the reason once.
  return { plan, analyzed }
}

/** Everything the client needs to render the app in one call. */
export function loadWorkspace(userId, now) {
  const exam = latestExam(userId)
  if (!exam) return { exam: null, subjects: [], topics: [], plan: null, quizzes: [], progress: [] }

  const analyzed = analyzeExam(exam.id, { now })
  const subjects = getSubjects(exam.id)
  const topics = analyzed.topics
  const quizzes = getQuizzes(exam.id)
  const progress = getProgress(exam.id)
  const plan = getPlan(exam.id)
  const hoursLeft = analyzed.hoursLeft

  const plannedHours = plan ? plan.stats.totalHours : 0
  const readiness = computeReadiness({
    topics,
    quizzes,
    exam,
    hoursLeft,
    plannedHours,
    now: now ? new Date(now) : new Date(),
  })

  const nowTopic = pickNow(analyzed)

  const totalMinutes = topics.reduce((a, t) => a + t.estimatedMinutes, 0)
  const remainingMinutes = topics.filter((t) => t.status !== 'done').reduce((a, t) => a + t.estimatedMinutes, 0)

  return {
    exam: { ...exam, emergencyMode: analyzed.emergency },
    subjects,
    topics,
    plan,
    quizzes,
    progress,
    readiness,
    analysis: {
      counts: analyzed.counts,
      emergency: analyzed.emergency,
      hoursLeft,
      remainingHours: analyzed.remainingHours,
      skippable: analyzed.skippable,
    },
    nowTopic,
    stats: {
      total: topics.length,
      completed: topics.filter((t) => t.status === 'done').length,
      remaining: topics.filter((t) => t.status !== 'done').length,
      critical: topics.filter((t) => t.priorityLevel === 'critical').length,
      high: topics.filter((t) => t.priorityLevel === 'high').length,
      studyHoursTotal: Math.round((totalMinutes / 60) * 10) / 10,
      studyHoursRemaining: Math.round((remainingMinutes / 60) * 10) / 10,
      avgConfidence: topics.length
        ? Math.round(topics.reduce((a, t) => a + t.confidence, 0) / topics.length)
        : 0,
      avgQuiz:
        quizzes.length > 0 ? Math.round(quizzes.reduce((a, q) => a + q.accuracy, 0) / quizzes.length) : null,
    },
  }
}
