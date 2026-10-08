import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { Field, Select, ErrorNote } from '../components/ui.jsx'

const COLORS = ['#3563f5', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6']

const defaultDate = (offsetDays = 1) => {
  const d = new Date(Date.now() + offsetDays * 864e5)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* ------------------------------------------------------------- tracks */

const TRACKS = {
  exam: {
    label: 'Exam / semester',
    icon: '📚',
    blurb: 'Boards, finals, vivas and competitive exams.',
    step: 'Exam setup',
    title: 'Let’s set up your exam',
    sub: 'These constraints decide how much time the plan can actually use — the closer the exam and the fewer hours, the more aggressive the prioritization becomes.',
    nameLabel: 'Exam name',
    namePh: 'Semester Final',
    dateLabel: 'Exam date',
    timeLabel: 'Exam start time',
    subjectsTitle: 'Subjects',
    subjectsHint: 'Add as many as you need — topics come next.',
    submit: 'Continue → Add topics',
    updated: 'Exam details updated',
    sample: 'Load sample data',
  },
  placement: {
    label: 'Placement / interview',
    icon: '💼',
    blurb: 'Internships, campus rounds, aptitude tests, HR rounds.',
    step: 'Placement setup',
    title: 'Set up your placement sprint',
    sub: 'Same priority engine, different target: rank aptitude, DSA, core subjects and HR prep by what actually gets asked — and what you are weakest at — before your interview date.',
    nameLabel: 'Company / round name',
    namePh: 'Campus Placements — TCS Digital',
    dateLabel: 'Interview / test date',
    timeLabel: 'Reported start time',
    subjectsTitle: 'What you are preparing',
    subjectsHint: 'Typical tracks below — trim or add your own.',
    submit: 'Continue → Add topics',
    updated: 'Placement sprint updated',
    sample: 'Load placement sample',
  },
}

const STARTERS = {
  exam: [{ name: 'Mathematics', color: COLORS[0] }],
  placement: [
    { name: 'Aptitude & Logical', color: COLORS[0] },
    { name: 'DSA & Problem Solving', color: COLORS[1] },
    { name: 'Core CS Fundamentals', color: COLORS[2] },
    { name: 'Interview & HR', color: COLORS[3] },
  ],
}

const KNOWN_STARTER_NAMES = new Set([...STARTERS.exam, ...STARTERS.placement].map((s) => s.name))
const isStarterList = (list) => list.every((s) => !s.name.trim() || KNOWN_STARTER_NAMES.has(s.name.trim()))

export default function Setup() {
  const nav = useNavigate()
  const location = useLocation()
  const { user, refresh, toast, workspace } = useApp()

  const trackParam = new URLSearchParams(location.search).get('track')
  const initialTrack =
    trackParam === 'placement' || trackParam === 'exam'
      ? trackParam
      : workspace?.exam?.goalType === 'placement'
        ? 'placement'
        : 'exam'

  const [form, setForm] = useState({
    goalType: initialTrack,
    studentName: user?.name || '',
    examName: '',
    examDate: defaultDate(),
    examTime: '09:00',
    hoursPerDay: 6,
    sessionLengthMin: 45,
    breakDurationMin: 15,
    studyStartTime: '09:00',
  })
  const [subjects, setSubjects] = useState(STARTERS[initialTrack].map((s) => ({ ...s })))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const track = TRACKS[form.goalType] || TRACKS.exam

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) }))

  const hours = useMemo(() => Number(form.hoursPerDay) || 0, [form.hoursPerDay])

  function chooseTrack(next) {
    if (next === form.goalType) return
    setForm((f) => ({ ...f, goalType: next }))
    if (isStarterList(subjects)) setSubjects(STARTERS[next].map((s) => ({ ...s })))
  }

  function addSubject() {
    setSubjects((s) => [...s, { name: '', color: COLORS[s.length % COLORS.length] }])
  }
  function updateSubject(i, patch) {
    setSubjects((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  }
  function removeSubject(i) {
    setSubjects((s) => s.filter((_, idx) => idx !== i))
  }

  function validate() {
    const e = {}
    if (!form.studentName?.trim()) e.studentName = 'Tell us who is studying.'
    if (!form.examName?.trim())
      e.examName = form.goalType === 'placement' ? 'Name the company or round.' : 'Name your exam.'
    if (!form.examDate) e.examDate = form.goalType === 'placement' ? 'Pick the interview date.' : 'Pick the exam date.'
    else if (new Date(`${form.examDate}T${form.examTime}`) < new Date(Date.now() - 36e5))
      e.examDate = 'That date has already passed.'
    if (!form.examTime) e.examTime = 'Pick the start time.'
    const h = Number(form.hoursPerDay)
    if (!h || h < 0.5 || h > 16) e.hoursPerDay = 'Between 0.5 and 16 hours.'
    const s = Number(form.sessionLengthMin)
    if (!s || s < 15 || s > 180) e.sessionLengthMin = '15–180 minutes.'
    const b = Number(form.breakDurationMin)
    if (b < 0 || b > 90) e.breakDurationMin = '0–90 minutes.'
    if (!subjects.length) e.subjects = 'Add at least one subject.'
    const empty = subjects.findIndex((x) => !x.name.trim())
    if (empty >= 0) e.subjects = `Subject ${empty + 1} needs a name.`
    return e
  }

  async function submit(e) {
    e?.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      const payload = { ...form, subjects }
      if (workspace?.exam) {
        await api.put('/exam', payload)
        // Subjects (and any sample topics) are added separately for an existing exam.
        for (const s of subjects) {
          if (!s.name.trim()) continue
          const existing = workspace.subjects?.find((x) => x.name === s.name)
          let subjectId = existing?.id
          if (!subjectId) {
            const out = await api.post('/subjects', { name: s.name, color: s.color })
            subjectId = out.subject?.id
          }
          if (subjectId && s.topics?.length) {
            const have = new Set(
              (workspace.topics || []).filter((t) => t.subjectId === subjectId).map((t) => t.name.toLowerCase())
            )
            const missing = s.topics.filter((t) => !have.has(String(t.name).toLowerCase()))
            if (missing.length) await api.post(`/subjects/${subjectId}/topics`, { topics: missing })
          }
        }
        toast(track.updated, 'success')
      } else {
        const out = await api.post('/setup', payload)
        toast(`Plan scaffolded — ${out.topics} topics ready to rank`, 'success')
      }
      await refresh({ silent: true })
      nav('/topics')
    } catch (err) {
      setErrors(err.errors || {})
      if (!err.errors) setErrors({ general: err.message })
      setBusy(false)
    }
  }

  async function loadSample(kind) {
    setLoadingSample(true)
    try {
      const { buildDemoPayloadClient, buildPlacementPayloadClient } = await import('../lib/demo.js')
      const sample = kind === 'placement' ? buildPlacementPayloadClient() : buildDemoPayloadClient()
      const { subjects: sampleSubjects, ...rest } = sample
      setForm(rest)
      setSubjects(
        sampleSubjects.map((s, i) => ({
          name: s.name,
          color: s.color || COLORS[i % COLORS.length],
          ...(s.topics ? { topics: s.topics } : {}),
        }))
      )
      setErrors({})
      toast(kind === 'placement' ? 'Placement sample loaded — press Continue' : 'Sample data loaded — press Continue', 'info')
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoadingSample(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">L</span>
            <span className="text-sm font-extrabold text-ink-900">Revision Assistant</span>
          </Link>
          <span className="text-xs font-semibold text-ink-400">Step 1 of 3 · {track.step}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">{track.title}</h1>
          <p className="mt-2 text-sm text-ink-500">{track.sub}</p>
        </div>

        {/* track picker */}
        <div className="mb-6" role="radiogroup" aria-label="What are you preparing for?">
          <p className="mb-2 text-sm font-bold text-ink-700">What are you preparing for?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(TRACKS).map(([key, t]) => {
              const active = form.goalType === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseTrack(key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 shadow-lift ring-1 ring-brand-500'
                      : 'border-ink-200 bg-surface hover:border-ink-300 hover:bg-ink-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-lg">{t.icon}</span>
                    <span className={`text-sm font-extrabold ${active ? 'text-brand-700' : 'text-ink-800'}`}>{t.label}</span>
                    {active && <span className="ml-auto chip bg-brand-600 text-white">Selected</span>}
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">{t.blurb}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* progress rail */}
        <div className="mb-8 flex items-center gap-2" aria-hidden="true">
          {[track.step, 'Topics', 'Your plan'].map((l, i) => (
            <div key={l} className="flex flex-1 items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-ink-200'}`} />
            </div>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="space-y-6">
          {errors.general && <ErrorNote>{errors.general}</ErrorNote>}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-400">Who & what</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student name" error={errors.studentName} required>
                {({ id, invalid }) => (
                  <input id={id} className={`field ${invalid ? 'field-error' : ''}`} value={form.studentName} onChange={set('studentName')} placeholder="Aarav Sharma" />
                )}
              </Field>
              <Field label={track.nameLabel} error={errors.examName} required>
                {({ id, invalid }) => (
                  <input id={id} className={`field ${invalid ? 'field-error' : ''}`} value={form.examName} onChange={set('examName')} placeholder={track.namePh} />
                )}
              </Field>
              <Field label={track.dateLabel} error={errors.examDate} required>
                {({ id, invalid }) => (
                  <input id={id} type="date" className={`field ${invalid ? 'field-error' : ''}`} value={form.examDate} onChange={set('examDate')} />
                )}
              </Field>
              <Field label={track.timeLabel} error={errors.examTime} required>
                {({ id, invalid }) => (
                  <input id={id} type="time" className={`field ${invalid ? 'field-error' : ''}`} value={form.examTime} onChange={set('examTime')} />
                )}
              </Field>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-400">Your study capacity</h2>
            <p className="mb-4 text-xs text-ink-500">
              The scheduler will never book more than this in a day.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Available study hours per day" error={errors.hoursPerDay} required>
                {({ id, invalid }) => (
                  <input id={id} type="number" min="0.5" max="16" step="0.5" className={`field ${invalid ? 'field-error' : ''}`} value={form.hoursPerDay} onChange={setNum('hoursPerDay')} />
                )}
              </Field>

              <Field label="Study start time" hint="Today’s plan starts from the next free slot.">
                {({ id }) => <input id={id} type="time" className="field" value={form.studyStartTime} onChange={set('studyStartTime')} />}
              </Field>

              <Field label="Preferred session length" error={errors.sessionLengthMin} hint="Minutes of focused study per block." required>
                {({ id, invalid }) => (
                  <Select id={id} invalid={invalid} value={form.sessionLengthMin} onChange={setNum('sessionLengthMin')}>
                    {[25, 30, 45, 50, 60, 90].map((v) => (
                      <option key={v} value={v}>{v} minutes</option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Break duration" error={errors.breakDurationMin} hint="Inserted after every session." required>
                {({ id, invalid }) => (
                  <Select id={id} invalid={invalid} value={form.breakDurationMin} onChange={setNum('breakDurationMin')}>
                    {[0, 5, 10, 15, 20, 30].map((v) => (
                      <option key={v} value={v}>{v === 0 ? 'No breaks' : `${v} minutes`}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">
              <strong>{hours}h/day</strong> × your session length = roughly{' '}
              <strong>{Math.max(1, Math.floor((hours * 60) / (Number(form.sessionLengthMin) || 45)))} blocks</strong> of
              focused study per day.
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{track.subjectsTitle}</h2>
                <p className="mt-1 text-xs text-ink-500">{track.subjectsHint}</p>
              </div>
              <span className="chip bg-ink-100 text-ink-600 ring-1 ring-inset ring-black/5">{subjects.length}</span>
            </div>

            {errors.subjects && (
              <p className="error-text mb-3" role="alert"><span aria-hidden="true">●</span> {errors.subjects}</p>
            )}

            <div className="space-y-2.5">
              {subjects.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 animate-fadeIn">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateSubject(i, { color: e.target.value })}
                    aria-label={`Colour for subject ${i + 1}`}
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-surface p-1"
                  />
                  <input
                    className="field"
                    value={s.name}
                    onChange={(e) => updateSubject(i, { name: e.target.value })}
                    placeholder={`Subject ${i + 1} — e.g. ${form.goalType === 'placement' ? 'Aptitude & Logical' : 'Mathematics'}`}
                    aria-label={`Subject ${i + 1} name`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubject(i)}
                    disabled={subjects.length === 1}
                    aria-label={`Remove subject ${i + 1}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-400 transition hover:border-red-200 hover:bg-red-50 hover:text-critical disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addSubject} className="btn-ghost mt-3 w-full border-dashed">
              + Add another subject
            </button>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="btn-primary flex-1 !py-3.5 text-base">
              {busy ? 'Creating your workspace…' : track.submit}
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => loadSample(form.goalType)}
              disabled={loadingSample}
              className="btn-ghost flex-1 !py-3"
            >
              {loadingSample ? 'Loading…' : track.sample}
            </button>
            <button
              type="button"
              onClick={() => loadSample(form.goalType === 'placement' ? 'exam' : 'placement')}
              disabled={loadingSample}
              className="btn-ghost flex-1 !py-3"
            >
              {form.goalType === 'placement' ? 'Exam sample instead' : 'Placement sample instead'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
