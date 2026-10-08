/**
 * ============================================================
 *  SCHEDULING ENGINE
 * ============================================================
 *  Turns a priority-ranked topic list into a real, time-boxed
 *  plan that fits the student's available hours.
 *
 *  Structure of a day:
 *    study block -> break -> study block -> break -> ...
 *    every 3rd session  -> quick quiz / practice questions
 *    last block of exam day -> final revision + formula sheet
 *    if enough time      -> mock test
 * ============================================================
 */

import { hoursUntilExam, urgencyFor } from './priorityEngine.js'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Local calendar-day key (YYYY-MM-DD).
 * NOTE: deliberately NOT toISOString(), which is UTC and shifts the
 * date in any timezone west of UTC — that produced overlapping blocks.
 */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function at(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(`${dateStr}T00:00:00`)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

function fmt(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Human label for a plan date: "TODAY", "TOMORROW", or "Wed, 12 Mar". */
export function dayLabel(dateStr, today = new Date()) {
  const t = new Date(dateStr)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - base) / 864e5)
  if (diff === 0) return 'TODAY'
  if (diff === 1) return 'TOMORROW'
  return t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Build the plan.
 * @param {Array} analyzed  scored topics (priority desc)
 * @param {Object} exam     exam settings
 * @param {Object} opts     { now }
 */
export function buildSchedule(analyzed, exam, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date()
  const topics = analyzed.topics.filter((t) => t.status !== 'done')
  const emergency = analyzed.emergency
  const hoursLeft = analyzed.hoursLeft

  const sessionMin = emergency ? Math.max(20, exam.sessionLengthMin) : exam.sessionLengthMin
  const breakMin = emergency ? Math.min(8, exam.breakDurationMin) : exam.breakDurationMin
  const dailyCap = emergency ? Math.min(10, exam.hoursPerDay * 1.15) : exam.hoursPerDay

  const examEnd = at(exam.examDate, exam.examTime)
  const lastUseful = new Date(examEnd.getTime() - 45 * 60000) // reserve 45 min buffer

  const sessions = []
  let dayIndex = 0
  let cursor = null
  let usedToday = 0
  let pending = [...topics]
  let sessionCount = 0

  const nextDayStart = (dateStr) => {
    let start = at(dateStr, exam.studyStartTime || '09:00')
    // Today: never schedule in the past.
    if (dateStr === dayKey(now) && start < now) {
      const rounded = new Date(now.getTime() + 5 * 60000)
      rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0)
      start = rounded
    }
    return start
  }

  let currentDay = dayKey(now)
  cursor = nextDayStart(currentDay)

  const push = (kind, title, mins, extra = {}) => {
    const start = new Date(cursor)
    const end = new Date(start.getTime() + mins * 60000)
    if (end > lastUseful) return false
    sessions.push({
      kind,
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      startTime: fmt(start),
      endTime: fmt(end),
      dayIndex,
      dayKey: currentDay,
      dayLabel: dayLabel(currentDay, now),
      position: sessions.length,
      mins,
      ...extra,
    })
    cursor = end
    usedToday += mins / 60
    return true
  }

  const addBreak = () => {
    if (breakMin > 0) push('break', 'Break', breakMin, { topicId: null })
  }

  const rollDay = () => {
    dayIndex++
    const d = new Date(`${currentDay}T00:00:00`)
    d.setDate(d.getDate() + 1)
    currentDay = dayKey(d)
    if (currentDay >= exam.examDate) return false
    if (at(currentDay, exam.studyStartTime || '09:00') > lastUseful) return false
    cursor = nextDayStart(currentDay)
    usedToday = 0
    sessionCount = 0
    return true
  }

  // ---- Main loop -------------------------------------------------------
  let guard = 0
  while (pending.length && cursor && guard++ < 400) {
    if (usedToday >= dailyCap) {
      if (!rollDay()) break
      continue
    }
    if (cursor >= lastUseful) break

    sessionCount++

    // Reserve the final session of the day for consolidation.
    const timeLeftToday = dailyCap - usedToday
    const isLastSlotOfToday = timeLeftToday <= sessionMin / 60 + 0.001

    if (isLastSlotOfToday && sessions.some((s) => s.kind === 'study')) {
      const ok = push('final', 'Final revision — formula sheet & key concepts', Math.min(sessionMin, 30), {
        topicId: null,
        priority: 'high',
        reason: 'Consolidating today’s work before you stop',
      })
      if (!ok) break
      if (!rollDay()) break
      continue
    }

    // Every 3rd session: retrieval practice instead of passive reading.
    if (sessionCount % 3 === 0 && sessions.some((s) => s.kind === 'study')) {
      const quizTopic = pending[0]
      const ok = push('quiz', `Quick revision quiz — ${quizTopic.name}`, Math.min(15, sessionMin), {
        topicId: quizTopic.id,
        priority: quizTopic.priorityLevel,
        reason: 'Active recall beats re-reading',
      })
      if (!ok) break
      addBreak()
      continue
    }

    // Every 5th session: practice questions block.
    if (sessionCount % 5 === 0 && sessions.some((s) => s.kind === 'study')) {
      const p = pending[0]
      const ok = push('practice', `Practice questions — ${p.name}`, Math.min(25, sessionMin), {
        topicId: p.id,
        priority: p.priorityLevel,
        reason: 'Apply what you just revised',
      })
      if (!ok) break
      addBreak()
      continue
    }

    // Otherwise: the highest-priority topic that still fits the slot.
    const remainingTodayMin = Math.round((dailyCap - usedToday) * 60)
    let idx = pending.findIndex(
      (t) => Math.min(t.recommendedMinutes, sessionMin) <= remainingTodayMin && Math.min(t.recommendedMinutes, sessionMin) >= 5
    )
    if (idx === -1) idx = 0
    const topic = pending[idx]

    const mins = Math.min(topic.recommendedMinutes, sessionMin, Math.max(5, remainingTodayMin))
    const ok = push('study', topic.name, mins, {
      topicId: topic.id,
      subjectId: topic.subjectId,
      priority: topic.priorityLevel,
      score: topic.priorityScore,
      reason: topic.priorityReason,
      label: topic.priorityLabel,
    })
    if (!ok) break

    pending.splice(idx, 1)
    addBreak()
  }

  // ---- Mock test (only when there is genuinely enough runway) ----------
  const totalStudyHours = sessions
    .filter((s) => s.kind !== 'break')
    .reduce((a, s) => a + s.mins / 60, 0)

  if (totalStudyHours >= 5 && hoursLeft >= 5) {
    const mockMins = Math.min(60, Math.max(30, sessionMin))
    const mockCursor = new Date(lastUseful.getTime() - mockMins * 60000)
    if (mockCursor > cursor) {
      sessions.push({
        kind: 'mock',
        title: 'Full mock test',
        startAt: mockCursor.toISOString(),
        endAt: new Date(mockCursor.getTime() + mockMins * 60000).toISOString(),
        startTime: fmt(mockCursor),
        endTime: fmt(new Date(mockCursor.getTime() + mockMins * 60000)),
        dayIndex,
        dayKey: currentDay,
        dayLabel: dayLabel(currentDay, now),
        position: sessions.length,
        mins: mockMins,
        topicId: null,
        priority: 'critical',
        reason: 'Simulate exam pressure before the real thing',
      })
    }
  }

  // ---- Group by day ----------------------------------------------------
  const days = []
  for (const s of sessions) {
    let day = days.find((d) => d.key === s.dayKey)
    if (!day) {
      day = { key: s.dayKey, label: s.dayLabel, sessions: [], studyMinutes: 0 }
      days.push(day)
    }
    day.sessions.push(s)
    if (s.kind !== 'break') day.studyMinutes += s.mins
  }

  const skipped = pending.map((t) => ({
    id: t.id,
    name: t.name,
    priorityLevel: t.priorityLevel,
    advice:
      t.priorityLevel === 'low'
        ? 'Skipped — low return on time. Revise only if you finish everything else.'
        : 'Ran out of scheduled time — moved to the top of tomorrow.',
  }))

  const studyMinutes = sessions.filter((s) => s.kind !== 'break').reduce((a, s) => a + s.mins, 0)
  const breakMinutes = sessions.filter((s) => s.kind === 'break').reduce((a, s) => a + s.mins, 0)

  return {
    days,
    sessions,
    skipped,
    stats: {
      totalSessions: sessions.filter((s) => s.kind !== 'break').length,
      studyMinutes,
      breakMinutes,
      totalHours: Math.round((studyMinutes / 60) * 10) / 10,
      topicsPlanned: sessions.filter((s) => s.kind === 'study').length,
      topicsSkipped: skipped.length,
      emergency,
      generatedAt: new Date().toISOString(),
      daysLeft: Math.max(0, Math.ceil(hoursUntilExam(exam, now) / 24)),
    },
    meta: { sessionMin, breakMin, dailyCap, urgency: Math.round(urgencyFor(hoursUntilExam(exam, now)) * 100) },
  }
}

/** Is Emergency Mode warranted? */
export function shouldUseEmergency(exam, now = new Date()) {
  const h = hoursUntilExam(exam, now)
  return h > 0 && h <= 24
}
