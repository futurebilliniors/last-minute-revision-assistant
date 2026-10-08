/**
 * ============================================================
 *  EXAM READINESS ENGINE
 * ============================================================
 *  Produces a 0-100 readiness score plus an explanation of how
 *  it was calculated, split into weighted components.
 * ============================================================
 */

const W = {
  coverage: 0.25, // how much of the syllabus is actually revised
  confidence: 0.25, // self-rated confidence, weighted by importance
  performance: 0.25, // real quiz/test accuracy
  critical: 0.15, // are the make-or-break topics secured?
  time: 0.10, // is there enough time left to finish the plan?
}

const IMP = { low: 0.4, medium: 0.7, high: 1.0 }
const clamp = (n) => Math.min(100, Math.max(0, n))

export function computeReadiness({ topics, quizzes = [], exam, hoursLeft, plannedHours = 0, now = new Date() }) {
  const total = topics.length
  if (!total) {
    return {
      score: 0,
      components: [],
      strong: [],
      attention: [],
      explanation: 'Add topics to unlock your Exam Readiness Score.',
    }
  }

  const wSum = topics.reduce((a, t) => a + (IMP[t.importance] ?? 0.7), 0) || 1

  // 1. Coverage ---------------------------------------------------------
  const coverageRaw =
    topics.reduce((a, t) => a + (t.status === 'done' ? 1 : 0) * (IMP[t.importance] ?? 0.7), 0) / wSum

  // 2. Confidence -------------------------------------------------------
  const confidenceRaw =
    topics.reduce((a, t) => a + (t.confidence ?? 50) * (IMP[t.importance] ?? 0.7), 0) / wSum

  // 3. Performance (quiz accuracy) --------------------------------------
  const byTopic = new Map()
  quizzes.forEach((q) => {
    const arr = byTopic.get(q.topicId) || []
    arr.push(q)
    byTopic.set(q.topicId, arr)
  })
  let perfRaw = 0
  let perfWeight = 0
  topics.forEach((t) => {
    const list = byTopic.get(t.id) || []
    if (!list.length) return
    const acc = list.reduce((a, q) => a + q.accuracy, 0) / list.length
    const w = IMP[t.importance] ?? 0.7
    perfRaw += acc * w
    perfWeight += w
  })
  // `q.accuracy` is already a 0–100 percentage, so no ×100 here.
  const performance = perfWeight ? perfRaw / perfWeight : null

  // 4. Critical coverage ------------------------------------------------
  const criticals = topics.filter((t) => t.importance === 'high' || t.priorityLevel === 'critical')
  const criticalRaw = criticals.length
    ? criticals.filter((t) => t.status === 'done').length / criticals.length
    : 1

  // 5. Time adequacy ----------------------------------------------------
  const remainingMinutes = topics
    .filter((t) => t.status !== 'done')
    .reduce((a, t) => a + (t.estimatedMinutes || t.recommendedMinutes || 45), 0)
  const availableMinutes = Math.max(0, hoursLeft * (exam.hoursPerDay || 4) * 60)
  const timeRaw = remainingMinutes === 0 ? 1 : clamp((availableMinutes / remainingMinutes) * 100) / 100

  const components = [
    {
      key: 'coverage',
      label: 'Syllabus revised',
      weight: W.coverage,
      value: Math.round(coverageRaw * 100),
      display: `${topics.filter((t) => t.status === 'done').length}/${total} topics`,
      hint: 'Weighted by how important each topic is to your exam.',
    },
    {
      key: 'confidence',
      label: 'Confidence',
      weight: W.confidence,
      value: Math.round(confidenceRaw),
      display: `${Math.round(confidenceRaw)}% average`,
      hint: 'Your own confidence ratings, weighted by topic importance.',
    },
    {
      key: 'performance',
      label: 'Quiz performance',
      weight: W.performance,
      value: performance === null ? 50 : Math.round(performance),
      display: performance === null ? 'No quizzes yet (neutral 50%)' : `${Math.round(performance)}% accuracy`,
      hint:
        performance === null
          ? 'No attempt = neutral score. Take a quiz to sharpen this.'
          : 'Average accuracy across all quizzes, weighted by importance.',
      missing: performance === null,
    },
    {
      key: 'critical',
      label: 'Critical topics secured',
      weight: W.critical,
      value: Math.round(criticalRaw * 100),
      display: `${criticals.filter((t) => t.status === 'done').length}/${criticals.length} done`,
      hint: 'The make-or-break topics that carry the most marks.',
    },
    {
      key: 'time',
      label: 'Time available',
      weight: W.time,
      value: Math.round(timeRaw * 100),
      display: `${Math.round(hoursLeft)}h left · ${plannedHours}h planned`,
      hint: 'Whether your remaining hours cover the remaining work.',
    },
  ]

  const score = Math.round(
    components.reduce((a, c) => a + c.value * c.weight, 0)
  )

  const ranked = [...topics].sort(
    (a, b) =>
      (b.confidence ?? 50) + (b.previousScore ?? 50) - ((a.confidence ?? 50) + (a.previousScore ?? 50))
  )

  const strong = ranked
    .filter((t) => (t.confidence ?? 0) >= 65 || (t.previousScore ?? 0) >= 70)
    .slice(0, 4)

  const attention = ranked
    .filter((t) => (t.confidence ?? 100) < 65 && (t.previousScore ?? 100) < 70)
    .slice(0, 4)

  const grade =
    score >= 85 ? 'Excellent — you are exam ready.'
      : score >= 65 ? 'Good position — protect your weak spots.'
      : score >= 40 ? 'Passing range — prioritise high-weightage gaps.'
      : 'At risk — prioritise critical topics immediately.'

  return {
    score: clamp(score),
    grade,
    components,
    strong,
    attention,
    explanation: components
      .map((c) => `${c.label} ${c.value} × ${Math.round(c.weight * 100)}%`)
      .join(' + '),
    calculatedAt: new Date().toISOString(),
  }
}

/** Chart-ready progress history built from quiz + completion events. */
export function buildProgressSeries(quizzes, progressEvents) {
  const events = [
    ...quizzes.map((q) => ({ at: q.createdAt, value: q.accuracy, type: 'quiz' })),
    ...progressEvents
      .filter((p) => p.event === 'completed')
      .map((p) => ({ at: p.createdAt, value: null, type: 'completed' })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at))

  const points = []
  let running = 55
  events.forEach((e, i) => {
    if (e.type === 'quiz') {
      running = Math.round(running * 0.6 + e.value * 0.4)
      points.push({ label: `Attempt ${i + 1}`, value: Math.round(running), at: e.at })
    }
  })
  return points
}
