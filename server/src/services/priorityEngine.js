/**
 * ============================================================
 *  AI PRIORITY ENGINE
 * ============================================================
 *  Decides WHAT a student should revise first, and WHY.
 *
 *  A priority score (0-100) is derived from six weighted signals:
 *
 *    importance   30%  exam weightage of the topic
 *    confidence   22%  self-reported confidence gap
 *    performance  18%  previous quiz/test score gap
 *    difficulty   12%  hard topics need more reps
 *    urgency      12%  how close the exam is
 *    time-fit      6%  whether the topic fits an available session
 *
 *  Deliberately NOT alphabetical and NOT difficulty-only: a hard
 *  topic the student already masters is low priority, an easy
 *  topic they keep failing is high priority.
 * ============================================================
 */

const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n))

export const IMPORTANCE_W = { low: 0.4, medium: 0.7, high: 1.0 }
export const DIFFICULTY_W = { easy: 0.5, medium: 0.78, hard: 1.0 }

export const LEVELS = [
  { key: 'critical', label: 'CRITICAL', color: '#ef4444', min: 80 },
  { key: 'high', label: 'HIGH', color: '#f97316', min: 62 },
  { key: 'medium', label: 'MEDIUM', color: '#eab308', min: 45 },
  { key: 'low', label: 'LOW', color: '#22c55e', min: 0 },
]

export function levelFor(score) {
  return LEVELS.find((l) => score >= l.min) || LEVELS[3]
}

/** Hours until the exam starts (min 0). */
export function hoursUntilExam(exam, now = new Date()) {
  const [h, m] = String(exam.examTime || '09:00').split(':').map(Number)
  const target = new Date(`${exam.examDate}T00:00:00`)
  target.setHours(h || 0, m || 0, 0, 0)
  return Math.max(0, (target.getTime() - now.getTime()) / 36e5)
}

/**
 * Exam proximity. Full weight within ~6h, strong within 24h,
 * then decays across a week. Never zero — the exam always matters.
 */
export function urgencyFor(hoursLeft) {
  if (hoursLeft <= 6) return 1
  if (hoursLeft <= 24) return 0.92 + 0.08 * ((hoursLeft - 6) / 18)
  const days = hoursLeft / 24
  return clamp(0.62 * Math.exp(-0.22 * (days - 1)) + 0.2)
}

/** Does this topic's length suit the student's session length? */
function timeFitness(topic, sessionLengthMin) {
  const mins = topic.estimatedMinutes
  if (mins <= 5) return 0.25 // too small to be worth a slot
  if (mins <= sessionLengthMin * 1.6) return 1 // fits nicely
  if (mins <= sessionLengthMin * 2.5) return 0.6
  return 0.35 // needs splitting — deprioritise vs. quick wins
}

/**
 * Score one topic. Returns a full explanation payload.
 */
export function scoreTopic(topic, ctx) {
  const {
    hoursLeft,
    sessionLengthMin = 45,
    remainingHours = 999,
    emergency = false,
    totalTopics = 1,
    completedCount = 0,
  } = ctx

  const importance = IMPORTANCE_W[topic.importance] ?? 0.7
  const difficulty = DIFFICULTY_W[topic.difficulty] ?? 0.78

  const confidenceGap = clamp((100 - (topic.confidence ?? 50)) / 100)
  const hasScore = topic.previousScore !== null && topic.previousScore !== undefined
  const performanceGap = hasScore ? clamp((100 - topic.previousScore) / 100) : 0.65
  const urgency = urgencyFor(hoursLeft)
  const fit = timeFitness(topic, sessionLengthMin)

  const raw =
    0.3 * importance +
    0.22 * confidenceGap +
    0.18 * performanceGap +
    0.12 * difficulty +
    0.12 * urgency +
    0.06 * fit

  let score = raw * 100

  // Already revised → most of the urgency is gone.
  if (topic.status === 'done') score = score * 0.35

  // Time poverty: with very little study time left, favour value-per-minute.
  if (remainingHours < 40) {
    const density = importance / Math.max(15, topic.estimatedMinutes / 15)
    score *= 0.82 + 0.28 * clamp(density / 1.6)
  }

  // Emergency Mode (< 24h): strip low-value work, amplify weak + important.
  if (emergency) {
    const lowValue = topic.importance === 'low' && topic.difficulty === 'easy'
    const weakAndImportant = importance >= 0.7 && confidenceGap > 0.35
    if (lowValue) score *= 0.45
    else if (weakAndImportant) score *= 1.18
    else score *= 0.92
    if (hasScore && topic.previousScore < 50) score *= 1.1
  }

  score = Math.round(clamp(score, 1, 100) * 10) / 10

  const level = levelFor(score)
  const recommended = recommendedMinutes(topic, sessionLengthMin, level.key, remainingHours)

  return {
    ...topic,
    priorityScore: score,
    priorityLevel: level.key,
    priorityLabel: level.label,
    priorityColor: level.color,
    recommendedMinutes: recommended,
    priorityReason: buildReason(topic, {
      importance,
      confidenceGap,
      performanceGap,
      difficulty,
      urgency,
      hasScore,
      level: level.key,
      emergency,
      weight: ctx.weight || 'exam',
    }),
    signals: {
      importance: Math.round(importance * 100),
      confidenceGap: Math.round(confidenceGap * 100),
      performanceGap: Math.round(performanceGap * 100),
      difficulty: Math.round(difficulty * 100),
      urgency: Math.round(urgency * 100),
      timeFit: Math.round(fit * 100),
    },
  }
}

/** How long the student should actually spend on this topic right now. */
export function recommendedMinutes(topic, sessionLengthMin, level, remainingHours) {
  if (level === 'critical') return Math.min(topic.estimatedMinutes, sessionLengthMin)
  if (level === 'high') return Math.min(topic.estimatedMinutes, Math.round(sessionLengthMin * 0.85))
  if (level === 'medium') return Math.min(topic.estimatedMinutes, Math.round(sessionLengthMin * 0.6))
  const base = Math.min(topic.estimatedMinutes, Math.round(sessionLengthMin * 0.4))
  // When time is nearly gone, low-value topics get a skim only.
  return remainingHours < 12 ? Math.max(10, Math.round(base * 0.6)) : Math.max(15, base)
}

/** Human-readable "why is this first?" — the spec's key deliverable. */
function buildReason(topic, s) {
  const parts = []

  if (s.hasScore && topic.previousScore < 50) {
    parts.push(`Previous score ${topic.previousScore}%`)
  } else if (s.hasScore && topic.previousScore < 70) {
    parts.push(`Average past performance (${topic.previousScore}%)`)
  }

  if (topic.confidence <= 30) parts.push(`Very low confidence (${topic.confidence}%)`)
  else if (topic.confidence <= 55) parts.push(`Low confidence (${topic.confidence}%)`)

  if (topic.importance === 'high') parts.push(`High ${s.weight || 'exam'} weightage`)
  else if (topic.importance === 'low' && s.level === 'low') parts.push(`Low ${s.weight || 'exam'} weightage`)

  if (topic.difficulty === 'hard') parts.push('Difficult topic')
  if (topic.status === 'done') parts.push('Already revised — quick refresher')

  if (s.emergency && topic.importance === 'high') parts.push('Emergency mode: high-impact only')

  if (parts.length === 0) {
    parts.push(
      topic.importance === 'medium'
        ? 'Solid fundamentals — good marks per minute'
        : 'Well understood, keep for later'
    )
  }

  return parts.slice(0, 4).join(' + ')
}

/**
 * Score every topic, sort by priority, and annotate skip advice.
 * Persisted scores are only overwritten by callers that want to save.
 */
export function analyzeTopics(topics, exam, extras = {}) {
  const hoursLeft = extras.hoursLeft ?? hoursUntilExam(exam)
  const emergency = extras.emergency ?? (hoursLeft <= 24 && hoursLeft > 0)
  const sessionLengthMin = exam.sessionLengthMin || 45

  const done = topics.filter((t) => t.status === 'done').length
  const remainingHours = Math.max(
    0,
    hoursLeft - (topics.length - done) * (topics.reduce((a, t) => a + t.estimatedMinutes, 0) / Math.max(1, topics.length)) / 60
  )

  const ctx = {
    hoursLeft,
    sessionLengthMin,
    emergency,
    remainingHours,
    totalTopics: topics.length,
    completedCount: done,
    weight: exam.goalType === 'placement' ? 'interview' : 'exam',
  }

  const scored = topics.map((t) => scoreTopic(t, ctx))
  scored.sort((a, b) => b.priorityScore - a.priorityScore)

  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  scored.forEach((t) => counts[t.priorityLevel]++)

  // Topics the student can safely skim or skip when time is short.
  const skippable = scored
    .filter((t) => t.priorityLevel === 'low' && t.status !== 'done')
    .map((t) => ({ ...t, skipAdvice: t.importance === 'low' ? 'Skip if time runs out' : '2-minute skim only' }))

  return {
    topics: scored,
    counts,
    emergency,
    hoursLeft: Math.round(hoursLeft * 10) / 10,
    remainingHours: Math.round(remainingHours * 10) / 10,
    skippable,
    context: ctx,
  }
}

/** The "Study This Now" card: single best next action. */
export function pickNow(analyzed, activeTopicId = null) {
  const pending = analyzed.topics.filter((t) => t.status !== 'done')
  if (activeTopicId) {
    const active = pending.find((t) => t.id === activeTopicId)
    if (active) return active
  }
  return pending[0] || analyzed.topics[0] || null
}
