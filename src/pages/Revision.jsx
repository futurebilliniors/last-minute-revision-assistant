import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { Spinner, ErrorNote, Pill, PriorityBadge, EmptyState, Tabs, Tab, ProgressBar, Modal } from '../components/ui.jsx'

const STEPS = ['Learn', 'Practice', 'Results']

export default function Revision() {
  const { id } = useParams()
  const { refresh, toast, setPlanNotice } = useApp()

  const [session, setSession] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showAnswer, setShowAnswer] = useState([])
  const [doneOpen, setDoneOpen] = useState(false)

  const startedAt = useRef(Date.now())

  useEffect(() => {
    let alive = true
    setLoading(true)
    setSession(null)
    setResult(null)
    setStep(0)
    startedAt.current = Date.now()
    api
      .post(`/study/topics/${id}/start`, { count: 8 })
      .then((d) => alive && (setSession(d), setConfidence(d.topic.confidence)))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  const questions = session?.questions || []
  const sheet = session?.sheet

  const answered = answers.filter((a) => a !== undefined && a !== null).length

  const pick = (qi, oi) => {
    setAnswers((a) => {
      const next = [...a]
      next[qi] = oi
      return next
    })
    setShowAnswer((s) => {
      const next = [...s]
      next[qi] = true
      return next
    })
  }

  const submit = useCallback(async () => {
    if (!session) return
    setSubmitting(true)
    try {
      const out = await api.post(`/study/topics/${id}/quiz`, {
        answers,
        questions,
      })
      setResult(out)
      setStep(2)
      setConfidence(out.confidenceAfter)
      setPlanNotice(
        `Your plan has been updated based on your performance. ${out.message} Priority moved ${out.priority.before} → ${out.priority.after} (${out.priority.direction === 'up' ? '↑' : out.priority.direction === 'down' ? '↓' : '→'}).`
      )
      await refresh({ silent: true })
      toast(out.message, out.accuracy < 50 ? 'warn' : 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }, [session, id, answers, questions, refresh, toast, setPlanNotice])

  async function saveConfidence() {
    try {
      const out = await api.post(`/topics/${id}/confidence`, { confidence })
      await refresh({ silent: true })
      if (out.changed) {
        setPlanNotice(
          `Confidence updated (${out.confidence}%) — the priority engine re-scored this topic (${out.priority.before} → ${out.priority.after}) and rebuilt your schedule.`
        )
        toast('Priority re-calculated from your new confidence', 'info')
      } else {
        toast('Confidence saved', 'success')
      }
      setDoneOpen(false)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function markComplete() {
    try {
      await api.post(`/topics/${id}/complete`)
      await refresh({ silent: true })
      toast(`“${session.topic.name}” marked as revised`, 'success')
      setDoneOpen(false)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Spinner size={26} className="text-brand-700" />
        <p className="mt-4 text-sm font-semibold text-ink-600">Building your revision session…</p>
        <p className="mt-1 text-xs text-ink-400">Explanation, formulas and 8 practice questions</p>
      </div>
    )
  }

  if (err) return <ErrorNote onRetry={() => window.location.reload()}>{err}</ErrorNote>
  if (!session) return <EmptyState icon="🔍" title="Topic not found" action={<Link to="/topics" className="btn-primary">Back to topics</Link>} />

  const t = session.topic

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge level={t.priorityLevel} score={t.priorityScore} />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Revision mode</span>
          {session.subject && <Pill tone="blue">{session.subject}</Pill>}
          <span className="ml-auto text-xs text-ink-400">{t.recommendedMinutes} min block</span>
        </div>
        <h2 className="mt-2 text-2xl font-extrabold text-ink-900">{t.name}</h2>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-ink-400">
            <span>Step {step + 1} of 3 · {STEPS[step]}</span>
            <span>{Math.round(((step + 1) / 3) * 100)}%</span>
          </div>
          <ProgressBar value={((step + 1) / 3) * 100} tone="#3563f5" />
        </div>
      </div>

      {/* ------------------------------------------------ learn */}
      {step === 0 && (
        <div className="space-y-4 animate-fadeUp">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Concise explanation</h3>
              <Pill tone={session.source === 'ai' ? 'blue' : 'neutral'}>
                {session.source === 'ai' ? '✦ live model' : 'built-in engine'}
              </Pill>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{sheet.summary}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Key points</h3>
              <ul className="mt-3 space-y-2.5">
                {sheet.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-50 text-[10px] font-black text-brand-700">
                      {i + 1}
                    </span>
                    {k}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Formulas & concepts</h3>
              <ul className="mt-3 space-y-3">
                {sheet.formulas.map((f, i) => (
                  <li key={i} className="rounded-xl bg-night px-4 py-3">
                    <code className="block break-words text-sm font-semibold text-brand-300">{f.formula}</code>
                    <span className="mt-1 block text-xs text-ink-300">{f.meaning}</span>
                  </li>
                ))}
                {sheet.formulas.length === 0 && <li className="text-sm text-ink-500">No formulas for this topic.</li>}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card border-red-100 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-critical">⚠ Common mistakes</h3>
              <ul className="mt-3 space-y-2.5">
                {sheet.mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                    <span className="text-critical" aria-hidden="true">✕</span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Worked example</h3>
              <div className="mt-3 rounded-xl bg-ink-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Problem</div>
                <p className="mt-1 text-sm font-medium text-ink-800">{sheet.example.problem}</p>
              </div>
              <div className="mt-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-green-700">Solution</div>
                <p className="mt-1 text-sm text-green-900">{sheet.example.solution}</p>
              </div>
            </section>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary !px-7 !py-3" onClick={() => setStep(1)}>
              I understand → Test me
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ practice */}
      {step === 1 && (
        <div className="space-y-4 animate-fadeUp">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-ink-900">Practice questions</h3>
              <p className="text-sm text-ink-500">
                {answered}/{questions.length} answered · instant feedback on every choice
              </p>
            </div>
            <Pill tone="blue">{session.source === 'ai' ? '✦ AI generated' : 'built-in question bank'}</Pill>
          </div>

          <ol className="space-y-4">
            {questions.map((q, qi) => {
              const chosen = answers[qi]
              const revealed = showAnswer[qi]
              const correct = Number(q.answer)
              return (
                <li key={qi} className="card p-5">
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-black text-ink-500">
                      {qi + 1}
                    </span>
                    <p className="text-[15px] font-semibold leading-relaxed text-ink-900">{q.q}</p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => {
                      const isChosen = chosen === oi
                      const isCorrect = oi === correct
                      let cls = 'border-ink-200 bg-surface hover:border-brand-300 hover:bg-brand-50/40'
                      if (revealed) {
                        if (isCorrect) cls = 'border-green-300 bg-green-50'
                        else if (isChosen) cls = 'border-red-300 bg-red-50'
                        else cls = 'border-ink-100 bg-surface opacity-60'
                      }
                      return (
                        <button
                          key={oi}
                          onClick={() => pick(qi, oi)}
                          disabled={revealed}
                          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition ${cls}`}
                        >
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${
                            revealed && isCorrect
                              ? 'border-green-500 bg-green-500 text-white'
                              : revealed && isChosen
                                ? 'border-red-400 bg-red-400 text-white'
                                : 'border-ink-300 text-ink-400'
                          }`}>
                            {revealed && isCorrect ? '✓' : revealed && isChosen ? '✕' : String.fromCharCode(65 + oi)}
                          </span>
                          <span className="text-ink-700">{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {revealed && (
                    <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm animate-fadeUp ${
                      chosen === correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                    }`}>
                      <strong>{chosen === correct ? 'Correct.' : 'Not quite.'}</strong> {q.why}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="sticky bottom-20 flex flex-col gap-3 rounded-2xl border border-ink-100 bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
            <div className="text-sm text-ink-500">
              <strong className="text-ink-800">{answered}/{questions.length}</strong> answered
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setStep(0)}>← Back to notes</button>
              <button className="btn-primary" onClick={submit} disabled={submitting || answered === 0}>
                {submitting ? <><Spinner /> Scoring…</> : 'Submit answers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ results */}
      {step === 2 && result && (
        <div className="space-y-4 animate-fadeUp">
          <section className="card overflow-hidden">
            <div className={`px-5 py-6 text-center ${
              result.accuracy >= 75 ? 'bg-green-50' : result.accuracy >= 50 ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <div className={`text-6xl font-extrabold tabular-nums ${
                result.accuracy >= 75 ? 'text-green-700' : result.accuracy >= 50 ? 'text-yellow-700' : 'text-critical'
              }`}>
                {result.accuracy}%
              </div>
              <div className="mt-1 text-sm font-semibold text-ink-600">
                {result.correct} of {result.total} correct
              </div>
              <p className="mx-auto mt-3 max-w-md text-sm font-medium text-ink-700">{result.message}</p>
            </div>

            <div className="grid gap-4 border-t border-ink-100 p-5 sm:grid-cols-3">
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Priority change</div>
                <div className="mt-1 flex items-center gap-2 text-xl font-extrabold tabular-nums text-ink-900">
                  {result.priority.before} → {result.priority.after}
                  <span className={`text-sm ${
                    result.priority.direction === 'up' ? 'text-critical' : result.priority.direction === 'down' ? 'text-green-700' : 'text-ink-400'
                  }`}>
                    {result.priority.direction === 'up' ? '↑' : result.priority.direction === 'down' ? '↓' : '→'}
                  </span>
                </div>
                <div className="mt-1"><PriorityBadge level={result.priority.level} size="sm" /></div>
              </div>
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Confidence</div>
                <div className="mt-1 text-xl font-extrabold tabular-nums text-ink-900">
                  {result.confidenceBefore}% → {result.confidenceAfter}%
                </div>
              </div>
              <div className="rounded-xl bg-brand-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500">Schedule</div>
                <div className="mt-1 text-sm font-bold text-brand-900">Plan re-optimized automatically</div>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Answer review</h3>
            <ul className="mt-3 space-y-3">
              {result.detail.map((d, i) => (
                <li key={i} className={`flex gap-3 rounded-xl px-4 py-3 ${d.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className={`shrink-0 font-black ${d.ok ? 'text-green-700' : 'text-critical'}`}>
                    {d.ok ? '✓' : '✕'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{d.q}</p>
                    {!d.ok && (
                      <p className="mt-1 text-xs text-ink-600">
                        Correct answer: <strong>{d.correct !== undefined ? String.fromCharCode(65 + Number(d.correct)) : '?'}</strong>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-500">{d.why}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link to="/plan" className="btn-ghost">View updated plan</Link>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setDoneOpen(true)}>Rate my confidence</button>
              <Link to="/now" className="btn-primary">Next topic →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ confidence modal */}
      <Modal
        open={doneOpen}
        onClose={() => setDoneOpen(false)}
        title="How confident do you feel now?"
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <button className="btn-primary flex-1" onClick={saveConfidence}>Save & re-prioritize</button>
            <button className="btn-ghost" onClick={markComplete}>Mark complete</button>
          </div>
        }
      >
        <div className="text-center">
          <div className={`text-5xl font-extrabold tabular-nums ${
            confidence < 45 ? 'text-critical' : confidence < 70 ? 'text-high' : 'text-low'
          }`}>
            {confidence}%
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="mt-5 w-full accent-brand-600"
            aria-label="New confidence level"
          />
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            <span>No idea</span><span>Getting there</span><span>Confident</span>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Your new confidence is a weighted input (22%) to the priority score. Raising it lowers this topic’s priority
            and frees time for weaker areas.
          </p>
        </div>
      </Modal>
    </div>
  )
}
