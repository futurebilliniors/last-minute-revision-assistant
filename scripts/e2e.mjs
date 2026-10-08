/**
 * End-to-end smoke test for the API.  node scripts/e2e.mjs
 * Exercises the exact hackathon demo story.
 */

const BASE = process.env.BASE || 'http://localhost:3001'
let cookie = ''
let pass = 0
let fail = 0

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const setCookie = res.headers.getSetCookie?.() || []
  setCookie.forEach((c) => {
    const pair = c.split(';')[0]
    if (pair.startsWith('lmr_token=')) cookie = pair
  })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  return { status: res.status, data }
}

function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ''}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`)
  }
}

const label = (s) => console.log(`\n${s}`)

// ------------------------------------------------------------------ health
label('1. Health')
{
  const { status, data } = await call('/health')
  check('GET /health', status === 200 && data.ok === true, `ai=${data.ai}`)
}

// ------------------------------------------------------------------ auth
label('2. Auth')
{
  const bad = await call('/auth/register', { method: 'POST', body: { name: '', email: 'x', password: '1' } })
  check('rejects invalid registration', bad.status === 400 && !!bad.data.errors)

  const reg = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Test Student', email: `test+${Date.now()}@example.com`, password: 'secret123' },
  })
  check('register', reg.status === 201 && !!reg.data.user?.id)
  const regEmail = reg.data.user.email

  const me = await call('/auth/me')
  check('GET /auth/me', me.status === 200 && me.data.user.email === regEmail)

  const dup = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Dup', email: regEmail, password: 'secret123' },
  })
  check('duplicate email rejected', dup.status === 409)
}

// ------------------------------------------------------------------ setup
label('3. Setup (3 subjects, 15 topics, 8h/day, exam tomorrow)')
const tomorrow = () => {
  const d = new Date(Date.now() + 864e5)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
{
  const empty = await call('/setup', { method: 'POST', body: { studentName: 'T' } })
  check('validation rejects incomplete payload', empty.status === 400 && !!empty.data.errors)

  const payload = {
    studentName: 'Aarav Sharma',
    examName: 'Semester Final Examination',
    examDate: tomorrow(),
    examTime: '09:00',
    hoursPerDay: 8,
    sessionLengthMin: 45,
    breakDurationMin: 15,
    studyStartTime: '09:00',
    subjects: [
      {
        name: 'Mathematics', color: '#3563f5',
        topics: [
          { name: 'Probability', difficulty: 'hard', importance: 'high', confidence: 32, estimatedMinutes: 60, previousScore: 38 },
          { name: 'Matrices & Determinants', difficulty: 'medium', importance: 'high', confidence: 55, estimatedMinutes: 45, previousScore: 62 },
          { name: 'Differential Calculus', difficulty: 'hard', importance: 'high', confidence: 44, estimatedMinutes: 60, previousScore: 47 },
          { name: 'Statistics & Distributions', difficulty: 'medium', importance: 'medium', confidence: 61, estimatedMinutes: 40, previousScore: 68 },
          { name: 'Algebra & Quadratic Equations', difficulty: 'easy', importance: 'medium', confidence: 78, estimatedMinutes: 30, previousScore: 84 },
        ],
      },
      {
        name: 'Physics', color: '#f97316',
        topics: [
          { name: 'Rotational Dynamics', difficulty: 'hard', importance: 'high', confidence: 28, estimatedMinutes: 60, previousScore: 34 },
          { name: 'Current Electricity', difficulty: 'medium', importance: 'high', confidence: 50, estimatedMinutes: 45, previousScore: 55 },
          { name: 'Kinematics & Motion', difficulty: 'easy', importance: 'medium', confidence: 80, estimatedMinutes: 30, previousScore: 86, status: 'done' },
          { name: 'Optics', difficulty: 'medium', importance: 'medium', confidence: 46, estimatedMinutes: 40, previousScore: 51 },
          { name: 'Semiconductors', difficulty: 'easy', importance: 'low', confidence: 72, estimatedMinutes: 25, previousScore: 75 },
        ],
      },
      {
        name: 'Chemistry', color: '#22c55e',
        topics: [
          { name: 'Organic Reaction Mechanisms', difficulty: 'hard', importance: 'high', confidence: 35, estimatedMinutes: 60, previousScore: 41 },
          { name: 'Mole Concept & Stoichiometry', difficulty: 'medium', importance: 'high', confidence: 58, estimatedMinutes: 40, previousScore: 64 },
          { name: 'Chemical Bonding', difficulty: 'medium', importance: 'high', confidence: 66, estimatedMinutes: 45, previousScore: 71, status: 'done' },
          { name: 'Electrochemistry', difficulty: 'medium', importance: 'medium', confidence: 48, estimatedMinutes: 40, previousScore: 53 },
          { name: 'Periodic Table & Trends', difficulty: 'easy', importance: 'low', confidence: 85, estimatedMinutes: 20, previousScore: 90 },
        ],
      },
    ],
  }
  const res = await call('/setup', { method: 'POST', body: payload })
  check('POST /setup', res.status === 201 && res.data.topics === 15, `${res.data.topics} topics`)
}

// -------------------------------------------------------------- workspace
label('4. Workspace + priority engine')
let ws
{
  const { status, data } = await call('/workspace')
  ws = data
  check('GET /workspace', status === 200 && data.topics?.length === 15)
  check('exam loaded', data.exam?.examName === 'Semester Final Examination')
  check('readiness computed', typeof data.readiness?.score === 'number', `score=${data.readiness?.score}`)
  check('readiness has explanation', !!data.readiness?.explanation)
  check('emergency flag is a boolean', typeof data.analysis?.emergency === 'boolean',
    `emergency=${data.analysis?.emergency}, hoursLeft=${data.analysis?.hoursLeft}`)
  check('now topic selected', !!data.nowTopic?.name, data.nowTopic?.name)

  const sorted = [...data.topics].sort((a, b) => b.priorityScore - a.priorityScore)
  check('sorted by score desc', sorted[0].priorityScore >= sorted[sorted.length - 1].priorityScore,
    `${sorted[0].name} → ${Math.round(sorted[0].priorityScore)}`)
  check('not alphabetical', sorted[0].name !== sorted[sorted.length - 1].name)
  check('every topic has a reason', data.topics.every((t) => (t.priorityReason || '').length > 3))
  check('priority levels valid', data.topics.every((t) => ['critical', 'high', 'medium', 'low'].includes(t.priorityLevel)))
  check('critical count > 0', data.stats.critical > 0, `${data.stats.critical} critical, ${data.stats.high} high`)
}

// ------------------------------------------------------------------ plan
label('5. Schedule generation')
{
  const { status, data } = await call('/plan')
  check('GET /plan', status === 200 && !!data.plan?.days?.length)
  const plan = data.plan
  check('sessions include study blocks', plan.sessions.some((s) => s.kind === 'study'))
  check('sessions include breaks', plan.sessions.some((s) => s.kind === 'break'))
  check('sessions include quiz', plan.sessions.some((s) => s.kind === 'quiz'))
  check('sessions include practice', plan.sessions.some((s) => s.kind === 'practice'))
  check('sessions include final revision', plan.sessions.some((s) => s.kind === 'final'))
  check('sessions include mock test', plan.sessions.some((s) => s.kind === 'mock'))
  check('fits available hours', plan.stats.totalHours <= 8 * 3, `${plan.stats.totalHours}h planned`)

  // chronological order
  let ordered = true
  for (let i = 1; i < plan.sessions.length; i++) {
    if (new Date(plan.sessions[i].startAt) < new Date(plan.sessions[i - 1].endAt)) ordered = false
  }
  check('sessions do not overlap', ordered)
  check('every block has an end > start', plan.sessions.every((s) => new Date(s.endAt) > new Date(s.startAt)))

  const exp = await call('/plan/explanation')
  check('GET /plan/explanation', exp.status === 200 && exp.data.order?.length > 0)
}

// ------------------------------------------------------------- study now
label('6. Study This Now')
{
  const { status, data } = await call('/study/now')
  check('GET /study/now', status === 200 && !!data.topic)
  check('returns a reason', (data.topic.priorityReason || '').length > 3, data.topic.priorityReason)
}

// ------------------------------------------------------------ revision
label('7. AI revision mode')
let session
{
  const res = await call('/study/topics/' + ws.nowTopic.id + '/start', { method: 'POST', body: { count: 8 } })
  session = res.data
  check('POST /study/topics/:id/start', res.status === 200 && !!session.sheet)
  check('explanation present', (session.sheet.summary || '').length > 60)
  check('key points', session.sheet.keyPoints?.length >= 4)
  check('formulas', session.sheet.formulas?.length >= 1)
  check('common mistakes', session.sheet.mistakes?.length >= 3)
  check('worked example', !!session.sheet.example?.solution)
  check('8 questions generated', session.questions?.length === 8, `${session.questions?.length} questions`)
  check('questions have 4 options', session.questions.every((q) => q.options.length === 4))
  check('answers in range', session.questions.every((q) => q.answer >= 0 && q.answer < q.options.length))
}

// ---------------------------------------------------------------- quiz
label('8. Quiz submission → adaptive priority')
let quiz
{
  // Deliberately answer poorly to force a priority increase.
  const answers = session.questions.map(() => 0)
  const res = await call(`/study/topics/${ws.nowTopic.id}/quiz`, {
    method: 'POST',
    body: { answers, questions: session.questions },
  })
  quiz = res.data
  check('POST quiz', res.status === 200 && quiz.total === 8)
  check('accuracy computed', typeof quiz.accuracy === 'number', `${quiz.accuracy}%`)
  check('priority changed', quiz.priority.before !== quiz.priority.after,
    `${quiz.priority.before} → ${quiz.priority.after} (${quiz.priority.direction})`)
  check('plan marked updated', quiz.planUpdated === true)
  check('message explains change', !!quiz.message, quiz.message)

  const ws2 = await call('/workspace')
  check('workspace reflects new score', ws2.data.topics.some((t) => t.id === ws.nowTopic.id && t.priorityScore === quiz.priority.after))
  check('quiz stored', ws2.data.quizzes.length >= 1)
}

// --------------------------------------------------- confidence re-rate
label('9. Confidence re-rate feeds back')
{
  const res = await call(`/topics/${ws.nowTopic.id}/confidence`, { method: 'POST', body: { confidence: 90 } })
  check('POST confidence', res.status === 200 && res.data.confidence === 90)
  check('priority recalculated', typeof res.data.priority.after === 'number',
    `${res.data.priority.before} → ${res.data.priority.after}`)

  const bad = await call(`/topics/${ws.nowTopic.id}/confidence`, { method: 'POST', body: { confidence: 500 } })
  check('rejects out-of-range confidence', bad.status === 400)
}

// --------------------------------------------------- complete a topic
label('10. Mark topic complete')
{
  const t = ws.topics.find((x) => x.status !== 'done')
  const res = await call(`/topics/${t.id}/complete`, { method: 'POST' })
  check('POST complete', res.status === 200 && res.data.status === 'done')
  const ws2 = await call('/workspace')
  check('readiness recalculated', ws2.data.stats.completed > ws.stats.completed,
    `${ws.stats.completed} → ${ws2.data.stats.completed}`)
}

// -------------------------------------------------------- readiness + progress
label('11. Readiness + progress')
{
  const r = await call('/readiness')
  check('GET /readiness', r.status === 200 && r.data.components?.length === 5)
  check('score is 0–100', r.data.score >= 0 && r.data.score <= 100, `score=${r.data.score}`)
  check('every component is 0–100', r.data.components.every((c) => c.value >= 0 && c.value <= 100),
    r.data.components.map((c) => `${c.key}=${c.value}`).join(' '))
  check('has strong/attention lists', Array.isArray(r.data.strong) && Array.isArray(r.data.attention))
  check('weights sum to 100%', Math.abs(r.data.components.reduce((a, c) => a + c.weight, 0) - 1) < 0.001)

  const p = await call('/progress')
  check('GET /progress', p.status === 200 && p.data.bySubject?.length === 3)
  check('per-subject breakdown', p.data.bySubject.every((s) => typeof s.percent === 'number'))
  check('history recorded', p.data.history.length > 0, `${p.data.history.length} events`)
}

// ---------------------------------------------------------------- ai
label('12. AI service layer')
{
  const s = await call('/ai/status')
  check('GET /ai/status', s.status === 200 && ['remote', 'local'].includes(s.data.mode), `mode=${s.data.mode}`)

  const g = await call('/ai/generate-topics', {
    method: 'POST',
    body: { subjectName: 'Physics', syllabus: 'Kinematics, Work and energy, Optics', count: 6 },
  })
  check('generate topics', g.status === 200 && g.data.topics?.length === 6, g.data.topics?.map((t) => t.name).slice(0, 3).join(', '))
  check('topics normalized', g.data.topics.every((t) => ['easy', 'medium', 'hard'].includes(t.difficulty) && t.confidence >= 0 && t.confidence <= 100))

  const noSubject = await call('/ai/generate-topics', { method: 'POST', body: { syllabus: '' } })
  check('rejects empty subject', noSubject.status === 400)
}

// -------------------------------------------------------------- copilot
label('13. Revision Copilot (uses real data)')
for (const q of [
  'What should I study next?',
  'I have only 2 hours left. What should I revise?',
  'Which topics can I skip?',
  'How ready am I for the exam?',
]) {
  const res = await call('/ai/chat', { method: 'POST', body: { message: q } })
  check(`"${q}"`, res.status === 200 && (res.data.reply || '').length > 60, `${(res.data.reply || '').length} chars`)
}
{
  const empty = await call('/ai/chat', { method: 'POST', body: { message: '' } })
  check('rejects empty message', empty.status === 400)
}

// --------------------------------------------------------------- errors
label('14. Error handling')
{
  const r = await fetch(`${BASE}/api/nonexistent`)
  check('404 for unknown API route', r.status === 404)
  const r2 = await fetch(`${BASE}/api/workspace`)
  check('401 without session', r2.status === 401)
}

// ----------------------------------------------------- emergency mode
label('15. Emergency Mode (< 24 hours)')
{
  const soon = new Date(Date.now() + 12 * 36e5)
  const p2 = (n) => String(n).padStart(2, '0')
  await call('/auth/register', {
    method: 'POST',
    body: { name: 'Cram Student', email: `crisis+${Date.now()}@example.com`, password: 'secret123' },
  })
  const res = await call('/setup', {
    method: 'POST',
    body: {
      studentName: 'Cram Student',
      examName: 'Crisis Exam',
      examDate: `${soon.getFullYear()}-${p2(soon.getMonth() + 1)}-${p2(soon.getDate())}`,
      examTime: `${p2(soon.getHours())}:${p2(soon.getMinutes())}`,
      hoursPerDay: 6,
      sessionLengthMin: 45,
      breakDurationMin: 10,
      subjects: [
        {
          name: 'Maths',
          topics: [
            { name: 'Probability', difficulty: 'hard', importance: 'high', confidence: 30, estimatedMinutes: 60 },
            { name: 'Sets', difficulty: 'easy', importance: 'low', confidence: 85, estimatedMinutes: 20 },
            { name: 'Calculus', difficulty: 'hard', importance: 'high', confidence: 40, estimatedMinutes: 60 },
          ],
        },
      ],
    },
  })
  check('setup under 24h', res.status === 201)

  const ws3 = await call('/workspace')
  check('emergency mode activates', ws3.data.analysis?.emergency === true)
  check('low-value topic demoted', ws3.data.topics.find((t) => t.name === 'Sets')?.priorityLevel === 'low',
    `score=${Math.round(ws3.data.topics.find((t) => t.name === 'Sets')?.priorityScore ?? 0)}`)
  const top = [...ws3.data.topics].sort((a, b) => b.priorityScore - a.priorityScore)[0]
  check('weak + important ranks first', ['Probability', 'Calculus'].includes(top.name), top.name)
  check('readiness still computed', typeof ws3.data.readiness?.score === 'number')
}

// ------------------------------------------------------- placement track
label('16. Placement / interview track')
{
  await call('/auth/register', {
    method: 'POST',
    body: { name: 'Placement Student', email: `placement+${Date.now()}@example.com`, password: 'secret123' },
  })

  const res = await call('/setup', {
    method: 'POST',
    body: {
      goalType: 'placement',
      studentName: 'Priya Nair',
      examName: 'Campus Placements — TCS Digital',
      examDate: tomorrow(),
      examTime: '10:00',
      hoursPerDay: 6,
      sessionLengthMin: 50,
      breakDurationMin: 10,
      studyStartTime: '09:00',
      subjects: [
        {
          name: 'Aptitude & Logical', color: '#3563f5',
          topics: [
            { name: 'Percentages', difficulty: 'medium', importance: 'high', confidence: 45, estimatedMinutes: 40, previousScore: 52 },
            { name: 'Time, Speed & Distance', difficulty: 'hard', importance: 'high', confidence: 30, estimatedMinutes: 50, previousScore: 38 },
            { name: 'Data Interpretation — Charts & Tables', difficulty: 'medium', importance: 'high', confidence: 42, estimatedMinutes: 45 },
          ],
        },
        {
          name: 'Interview & HR', color: '#a855f7',
          topics: [
            { name: 'STAR Behavioural Stories', difficulty: 'medium', importance: 'high', confidence: 35, estimatedMinutes: 40 },
            { name: 'Tell Me About Yourself', difficulty: 'easy', importance: 'high', confidence: 55, estimatedMinutes: 15 },
            { name: 'Why This Company?', difficulty: 'medium', importance: 'medium', confidence: 60, estimatedMinutes: 20 },
          ],
        },
      ],
    },
  })
  check('placement setup', res.status === 201 && res.data.topics === 6, `${res.data.topics} topics`)

  const ws = await call('/workspace')
  check('goal_type persisted', ws.data.exam?.goalType === 'placement', `goalType=${ws.data.exam?.goalType}`)
  check('placement readiness computed', typeof ws.data.readiness?.score === 'number', `score=${ws.data.readiness?.score}`)
  check('plan generated for placement', !!ws.data.plan?.days?.length)

  const reason = ws.data.topics.find((t) => t.importance === 'high')?.priorityReason || ''
  check('reason wording is interview-aware', /interview weightage/.test(reason), reason)

  // Topic generation knows the placement subjects.
  const apt = await call('/ai/generate-topics', { method: 'POST', body: { subjectName: 'Aptitude & Logical', count: 8 } })
  check('aptitude preset topics', apt.status === 200 && apt.data.topics.some((t) => /percentage/i.test(t.name)),
    apt.data.topics?.map((t) => t.name).slice(0, 3).join(', '))
  const hr = await call('/ai/generate-topics', { method: 'POST', body: { subjectName: 'Interview & HR', count: 8 } })
  check('HR preset topics', hr.status === 200 && hr.data.topics.some((t) => /STAR|resume|yourself/i.test(t.name)),
    hr.data.topics?.map((t) => t.name).slice(0, 3).join(', '))

  // Revision sheet + questions come from the placement content banks.
  const target = ws.data.topics.find((t) => t.name === 'Percentages')
  const rev = await call(`/study/topics/${target.id}/start`, { method: 'POST', body: { count: 8 } })
  check('aptitude revision sheet', rev.status === 200 && /percent/i.test(rev.data.sheet?.summary || ''),
    (rev.data.sheet?.summary || '').slice(0, 60) + '…')
  check('aptitude MCQs', rev.data.questions?.length === 8)

  const hrTopic = ws.data.topics.find((t) => t.name === 'STAR Behavioural Stories')
  const hrRev = await call(`/study/topics/${hrTopic.id}/start`, { method: 'POST', body: { count: 8 } })
  check('HR revision sheet', /behavioural|interview/i.test(hrRev.data.sheet?.summary || ''),
    (hrRev.data.sheet?.summary || '').slice(0, 60) + '…')
  check('HR sheet teaches STAR', (hrRev.data.sheet?.keyPoints || []).some((k) => /STAR/.test(k)))

  // Copilot answers placement questions with the real data.
  const chat = await call('/ai/chat', { method: 'POST', body: { message: 'How should I prepare for my HR interview?' } })
  check('placement copilot reply', chat.status === 200 && /interview/i.test(chat.data.reply || ''),
    `${(chat.data.reply || '').length} chars`)

  // Switching back to the exam track round-trips through the API.
  const put = await call('/exam', { method: 'PUT', body: { ...ws.data.exam, goalType: 'exam' } })
  const ws2 = await call('/workspace')
  check('PUT /exam can switch track', put.status === 200 && ws2.data.exam?.goalType === 'exam')
}

// --------------------------------------------------------- demo entry
label('17. One-click demo (landing page entry point)')
{
  const d = await call('/auth/demo', { method: 'POST' })
  check('POST /auth/demo', d.status === 200 && d.data.user?.email === 'demo@revision.app', d.data.user?.email)
  const ws = await call('/workspace')
  check('demo workspace loads', ws.status === 200 && ws.data.topics?.length === 15, `${ws.data.topics?.length} topics`)
  check('demo has a plan', !!ws.data.plan?.days?.length)
  check('demo has exam goal type', ['exam', 'placement'].includes(ws.data.exam?.goalType), ws.data.exam?.goalType)
}

// ------------------------------------------------------ profile menu
label('18. Profile endpoint (corner account menu)')
{
  const p = await call('/profile')
  check('GET /profile', p.status === 200 && p.data.user?.email === 'demo@revision.app', `${p.status}`)
  check('identity has id + member since', !!p.data.user?.id && !!p.data.user?.memberSince)
  check('revision plans counted', p.data.plans?.total >= 1, `${p.data.plans?.total} plans`)
  check('current plan mapped', !!p.data.plans?.current?.examName, p.data.plans?.current?.examName)
  check('activity stats present', p.data.stats?.topics >= 15 && typeof p.data.stats?.sessions === 'number', `${p.data.stats?.topics} topics, ${p.data.stats?.sessions} sessions`)
  check('readiness included', p.data.readiness == null || typeof p.data.readiness.score === 'number', p.data.readiness?.score)
}

console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${pass} passed, ${fail} failed`)
console.log(`${'─'.repeat(50)}\n`)
process.exit(fail ? 1 : 0)
