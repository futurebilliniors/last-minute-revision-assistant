import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { Field, Select, Modal, EmptyState, PriorityBadge, Spinner, ErrorNote, Pill } from '../components/ui.jsx'

const DIFFS = ['easy', 'medium', 'hard']
const IMPS = ['low', 'medium', 'high']

function TopicForm({ onSubmit, onCancel, initial, submitLabel = 'Add topic' }) {
  const [t, setT] = useState(
    initial || {
      name: '',
      difficulty: 'medium',
      importance: 'medium',
      confidence: 50,
      estimatedMinutes: 45,
      previousScore: '',
      notes: '',
    }
  )
  const [err, setErr] = useState({})

  const set = (k) => (e) => setT((v) => ({ ...v, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    const found = {}
    if (!t.name.trim()) found.name = 'Topic name is required.'
    const mins = Number(t.estimatedMinutes)
    if (!mins || mins < 5 || mins > 300) found.estimatedMinutes = '5–300 minutes.'
    if (t.previousScore !== '' && (Number(t.previousScore) < 0 || Number(t.previousScore) > 100))
      found.previousScore = '0–100.'
    setErr(found)
    if (Object.keys(found).length) return
    onSubmit({ ...t, name: t.name.trim(), estimatedMinutes: mins, previousScore: t.previousScore === '' ? null : Number(t.previousScore) })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Chapter / topic name" error={err.name} required>
        {({ id, invalid }) => (
          <input id={id} className={`field ${invalid ? 'field-error' : ''}`} value={t.name} onChange={set('name')} placeholder="Probability" autoFocus />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Difficulty">
          {({ id }) => (
            <Select id={id} value={t.difficulty} onChange={set('difficulty')}>
              {DIFFS.map((d) => (
                <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Importance / weightage" hint="How many marks this carries in your exam.">
          {({ id }) => (
            <Select id={id} value={t.importance} onChange={set('importance')}>
              {IMPS.map((d) => (
                <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="label !mb-0">Confidence</span>
          <span className={`text-sm font-extrabold ${t.confidence < 45 ? 'text-critical' : t.confidence < 70 ? 'text-high' : 'text-low'}`}>
            {t.confidence}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={t.confidence}
          onChange={(e) => setT((v) => ({ ...v, confidence: Number(e.target.value) }))}
          className="w-full accent-brand-600"
          aria-label="Confidence percentage"
        />
        <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          <span>No idea</span><span>Getting there</span><span>Confident</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated study time (min)" error={err.estimatedMinutes} required>
          {({ id, invalid }) => (
            <input id={id} type="number" min="5" max="300" step="5" className={`field ${invalid ? 'field-error' : ''}`} value={t.estimatedMinutes} onChange={set('estimatedMinutes')} />
          )}
        </Field>
        <Field label="Previous score (%)" error={err.previousScore} hint="Leave blank if you’ve never been tested.">
          {({ id, invalid }) => (
            <input id={id} type="number" min="0" max="100" className={`field ${invalid ? 'field-error' : ''}`} value={t.previousScore} onChange={set('previousScore')} placeholder="e.g. 42" />
          )}
        </Field>
      </div>

      <div className="flex gap-2.5 pt-1">
        <button type="submit" className="btn-primary flex-1">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        )}
      </div>
    </form>
  )
}

/* ------------------------------------------------- AI topic generator */

function AIGenerator({ open, onClose, examName, onInsert }) {
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ subjectName: '', syllabus: '', count: 8 })
  const [suggestions, setSuggestions] = useState([])
  const [picked, setPicked] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('form')
      setErr(null)
      setSuggestions([])
      setPicked({})
    }
  }, [open])

  async function generate(e) {
    e.preventDefault()
    setErr(null)
    if (!form.subjectName.trim()) {
      setErr('Enter the subject first.')
      return
    }
    setBusy(true)
    try {
      const out = await api.post('/ai/generate-topics', { ...form, examName })
      setSuggestions(out.topics)
      setPicked(Object.fromEntries(out.topics.map((t, i) => [i, true])))
      setStep('review')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const chosen = suggestions.filter((_, i) => picked[i])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={step === 'form' ? 'Generate topics using AI' : `Review ${chosen.length} suggested topics`}
      footer={
        step === 'form' ? null : (
          <div className="flex gap-2.5">
            <button
              className="btn-primary flex-1"
              disabled={!chosen.length}
              onClick={() => { onInsert(chosen); onClose() }}
            >
              Add {chosen.length} topics
            </button>
            <button className="btn-ghost" onClick={() => setStep('form')}>← Back</button>
          </div>
        )
      }
    >
      {step === 'form' ? (
        <form onSubmit={generate} className="space-y-4">
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
            Tell it the subject and paste (or summarise) the syllabus. It returns high-yield chapters with a suggested
            difficulty, weightage and time — you edit anything before adding.
          </div>

          <Field label="Subject" required error={err && !form.subjectName.trim() ? err : null}>
            {({ id }) => (
              <input id={id} className="field" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} placeholder="Mathematics" />
            )}
          </Field>

          <Field label="Syllabus / notes" hint="Paste chapter names, unit list, or anything your teacher highlighted.">
            {({ id }) => (
              <textarea
                id={id}
                className="field min-h-[110px] resize-y"
                value={form.syllabus}
                onChange={(e) => setForm((f) => ({ ...f, syllabus: e.target.value }))}
                placeholder={'Unit I: Probability, Conditional probability, Bayes theorem\nUnit II: Matrices, Determinants…'}
              />
            )}
          </Field>

          <Field label="How many topics?">
            {({ id }) => (
              <Select id={id} value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))}>
                {[5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} topics</option>)}
              </Select>
            )}
          </Field>

          {err && typeof err === 'string' && <ErrorNote>{err}</ErrorNote>}

          <button className="btn-primary w-full !py-3" disabled={busy}>
            {busy ? <><Spinner /> Generating…</> : '✦ Generate topics'}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-500">
            Untick anything that isn’t in your syllabus. You can adjust difficulty, importance and confidence afterwards.
          </p>
          <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {suggestions.map((t, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  picked[i] ? 'border-brand-200 bg-brand-50/50' : 'border-ink-200 bg-surface opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!picked[i]}
                  onChange={() => setPicked((p) => ({ ...p, [i]: !p[i] }))}
                  className="mt-1 h-4 w-4 accent-brand-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{t.name}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <Pill tone={t.difficulty === 'hard' ? 'red' : t.difficulty === 'medium' ? 'amber' : 'green'}>{t.difficulty}</Pill>
                    <Pill tone={t.importance === 'high' ? 'blue' : 'neutral'}>imp: {t.importance}</Pill>
                    <Pill>{t.estimatedMinutes} min</Pill>
                    <Pill>conf {t.confidence}%</Pill>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

/* -------------------------------------------------------------- page */

export default function Topics() {
  const nav = useNavigate()
  const { workspace, refresh, toast, mutate, aiStatus } = useApp()
  const exam = workspace?.exam
  const subjects = workspace?.subjects || []
  const topics = workspace?.topics || []

  const [addingTo, setAddingTo] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiSubject, setAiSubject] = useState('')
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const grouped = useMemo(
    () => subjects.map((s) => ({ ...s, topics: topics.filter((t) => t.subjectId === s.id) })),
    [subjects, topics]
  )

  useEffect(() => {
    if (!exam) nav('/setup')
  }, [exam, nav])

  if (!exam) return null

  async function addTopic(subjectId, payload) {
    try {
      await api.post(`/subjects/${subjectId}/topics`, { topics: [payload] })
      await refresh({ silent: true })
      toast(`“${payload.name}” added and prioritized`, 'success')
      setAddingTo(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function insertGenerated(subjectName, list) {
    const subject = subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase()) || subjects[0]
    if (!subject) {
      toast('Add that subject first, then generate topics.', 'error')
      return
    }
    try {
      await api.post(`/subjects/${subject.id}/topics`, { topics: list })
      await refresh({ silent: true })
      toast(`${list.length} AI topics added to ${subject.name}`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function removeTopic(id, name) {
    try {
      await api.del(`/topics/${id}`)
      await refresh({ silent: true })
      toast(`Removed “${name}”`, 'info')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function analyze() {
    if (!topics.length) {
      toast('Add at least one topic first.', 'warn')
      return
    }
    setAnalyzing(true)
    try {
      await api.post('/plan/regenerate', {})
      await refresh({ silent: true })
      nav('/analysis')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink-900">Your syllabus</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-500">
              Add every topic you might be examined on. Difficulty, importance, confidence and past scores are what the
              priority engine actually reads — so be honest, it only helps you.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="btn-ghost" onClick={() => { setAiSubject(subjects[0]?.name || ''); setAiOpen(true) }}>
              ✦ Generate with AI
            </button>
            <button className="btn-primary" onClick={analyze} disabled={analyzing || !topics.length}>
              {analyzing ? <><Spinner /> Analyzing…</> : `Analyze ${topics.length} topics →`}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ['Topics', topics.length, 'text-ink-900'],
            ['Subjects', subjects.length, 'text-ink-900'],
            ['Total study time', `${Math.round(topics.reduce((a, t) => a + t.estimatedMinutes, 0) / 60 * 10) / 10}h`, 'text-ink-900'],
            ['AI engine', aiStatus ? (aiStatus.mode === 'remote' ? 'Connected' : 'Offline') : '…', aiStatus?.mode === 'remote' ? 'text-green-700' : 'text-brand-700'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-ink-50 px-3.5 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{l}</div>
              <div className={`text-lg font-extrabold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects yet"
          body="Go back to setup and add the subjects you’re being examined on."
          action={<Link to="/setup" className="btn-primary">Back to setup</Link>}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((s) => (
            <section key={s.id} className="card overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-800">{s.name}</h3>
                  <span className="chip bg-surface text-ink-500 ring-1 ring-inset ring-ink-200">
                    {s.topics.length} {s.topics.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                <button className="btn-ghost !py-1.5 !px-3 !text-xs" onClick={() => setAddingTo(s.id)}>
                  + Add topic
                </button>
              </header>

              {s.topics.length === 0 ? (
                <div className="px-5 py-6">
                  <p className="text-sm text-ink-500">
                    No topics in {s.name} yet.{' '}
                    <button className="font-semibold text-brand-700 hover:underline" onClick={() => { setAiSubject(s.name); setAiOpen(true) }}>
                      Generate them with AI
                    </button>{' '}
                    or add one manually.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {s.topics.map((t) => (
                    <li
                      key={t.id}
                      className={`group priority-bar relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 pl-6 p-${t.priorityLevel}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-ink-900">{t.name}</span>
                          {t.status === 'done' && <Pill tone="green">✓ revised</Pill>}
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {t.difficulty} · {t.importance} importance · conf {t.confidence}%
                          {t.previousScore != null && ` · prev ${t.previousScore}%`} · {t.estimatedMinutes} min
                        </p>
                      </div>
                      <PriorityBadge level={t.priorityLevel} score={t.priorityScore} size="sm" />
                      <button
                        onClick={() => removeTopic(t.id, t.name)}
                        aria-label={`Remove ${t.name}`}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-300 opacity-0 transition hover:bg-red-50 hover:text-critical focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Link to="/setup" className="btn-ghost">← Exam setup</Link>
        <button className="btn-primary" onClick={analyze} disabled={analyzing || !topics.length}>
          {analyzing ? <><Spinner /> Analyzing…</> : 'Run AI priority analysis →'}
        </button>
      </div>

      {/* ---------------------------------------------------- modals */}
      {addingTo && (
        <Modal open onClose={() => setAddingTo(null)} title="Add a topic" size="sm">
          <TopicForm onCancel={() => setAddingTo(null)} onSubmit={(p) => addTopic(addingTo, p)} />
        </Modal>
      )}

      <AIGenerator
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        examName={exam.examName}
        onInsert={(list) => insertGenerated(aiSubject || subjects[0]?.name, list)}
      />
    </div>
  )
}
