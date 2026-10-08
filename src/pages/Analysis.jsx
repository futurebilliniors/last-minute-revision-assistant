import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { PriorityBadge, Pill, Spinner, EmptyState, ErrorNote, Modal } from '../components/ui.jsx'

const SIGNALS = [
  ['importance', 'Importance', '#3563f5'],
  ['confidenceGap', 'Confidence gap', '#ef4444'],
  ['performanceGap', 'Past performance gap', '#f97316'],
  ['difficulty', 'Difficulty', '#a855f7'],
  ['urgency', 'Exam proximity', '#eab308'],
  ['timeFit', 'Time fit', '#22c55e'],
]

function SignalBars({ signals, placement = false }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {SIGNALS.map(([key, label, color]) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="font-semibold text-ink-500">
              {key === 'urgency' && placement ? 'Interview proximity' : label}
            </span>
            <span className="font-bold text-ink-700">{signals?.[key] ?? 0}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${signals?.[key] ?? 0}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Analysis() {
  const nav = useNavigate()
  const { workspace, refresh, toast, aiStatus } = useApp()
  const [explanation, setExplanation] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [openTopic, setOpenTopic] = useState(null)

  const topics = workspace?.topics || []
  const exam = workspace?.exam
  const emergency = workspace?.analysis?.emergency
  const placement = exam?.goalType === 'placement'

  useEffect(() => {
    api.get('/plan/explanation')
      .then(setExplanation)
      .catch((e) => setErr(e.message))
  }, [workspace?.topics?.length])

  if (!topics.length) {
    return (
      <EmptyState
        icon="🧭"
        title="Nothing to analyze yet"
        body="Add your topics first — the priority engine needs difficulty, importance and confidence to rank anything."
        action={<Link to="/topics" className="btn-primary">Add topics</Link>}
      />
    )
  }

  async function generatePlan() {
    setBusy(true)
    try {
      await api.post('/plan/regenerate', {})
      await refresh({ silent: true })
      toast('Your optimized plan is ready', 'success')
      nav('/plan')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const counts = explanation?.counts || workspace?.analysis?.counts || { critical: 0, high: 0, medium: 0, low: 0 }
  const ranked = [...topics].sort((a, b) => b.priorityScore - a.priorityScore)

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- header */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-6 text-white sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">AI Priority Engine</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            {ranked.length} topics ranked — here is your order
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            Each score blends six weighted signals: importance (30%), confidence gap (22%), past performance (18%),
            difficulty (12%), exam proximity (12%) and time fit (6%). It is <em>not</em> alphabetical, and not
            difficulty alone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">hours left: {workspace?.analysis?.hoursLeft ?? '—'}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              AI: {aiStatus ? (aiStatus.mode === 'remote' ? 'connected model' : 'offline engine') : '…'}
            </span>
            {emergency && <span className="rounded-full bg-red-500/70 px-3 py-1 font-bold">🚨 EMERGENCY MODE</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-ink-100 sm:grid-cols-4">
          {[
            ['CRITICAL', counts.critical, 'text-critical'],
            ['HIGH', counts.high, 'text-high'],
            ['MEDIUM', counts.medium, 'text-yellow-700'],
            ['LOW', counts.low, 'text-green-700'],
          ].map(([label, value, cls]) => (
            <div key={label} className="px-5 py-4 text-center">
              <div className={`text-3xl font-extrabold ${cls}`}>{value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {err && <ErrorNote onRetry={() => window.location.reload()}>{err}</ErrorNote>}

      {/* ------------------------------------------------------- ranked */}
      <section className="card">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Recommended order</h3>
          <span className="text-xs text-ink-400">Tap a row for the full breakdown</span>
        </header>

        <ol className="divide-y divide-ink-100">
          {ranked.map((t, i) => (
            <li key={t.id}>
              <button
                onClick={() => setOpenTopic(t)}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-ink-50/70 p-${t.priorityLevel} priority-bar relative pl-6`}
              >
                <span className="mt-0.5 w-6 shrink-0 text-xs font-black text-ink-300">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-ink-900">{t.name}</span>
                    <PriorityBadge level={t.priorityLevel} size="sm" />
                    {t.status === 'done' && <Pill tone="green">✓ revised</Pill>}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">{t.priorityReason}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <Pill>{t.recommendedMinutes} min</Pill>
                    <Pill>conf {t.confidence}%</Pill>
                    <Pill>{t.importance} importance</Pill>
                    {t.previousScore != null && <Pill>prev {t.previousScore}%</Pill>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-2xl font-extrabold tabular-nums text-ink-900">{Math.round(t.priorityScore)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">score</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- skippable */}
      {explanation?.skipped?.length > 0 && (
        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Safe to skip if time runs out</h3>
          <p className="mt-1.5 text-xs text-ink-500">
            Low priority = low return per minute. Only touch these after every CRITICAL and HIGH topic is done.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {explanation.skipped.map((t) => (
              <li key={t.id} className="rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                <div className="text-sm font-bold text-green-800">{t.name}</div>
                <div className="text-[11px] text-green-700">{t.skipAdvice || 'Skip if time runs out'}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------- explain */}
      <section className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">How the score is built</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wider text-ink-400">
                <th className="pb-2 pr-4 font-bold">Signal</th>
                <th className="pb-2 pr-4 font-bold">Weight</th>
                <th className="pb-2 font-bold">Means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {[
                ['Importance', '30%', placement ? 'Interview weightage — the rounds that decide offers float up' : 'Exam weightage — high-markage topics always float up'],
                ['Confidence gap', '22%', '(100 − your confidence). Low confidence = urgent'],
                ['Past performance', '18%', '(100 − your last score). Untested topics use 65%'],
                ['Difficulty', '12%', 'Hard topics need more reps to stick'],
                [placement ? 'Interview proximity' : 'Exam proximity', '12%', placement ? 'Sharper as the interview date approaches' : 'Sharper as the exam approaches'],
                ['Time fit', '6%', 'Whether it fits one session cleanly'],
              ].map(([s, w, m]) => (
                <tr key={s}>
                  <td className="py-2.5 pr-4 font-semibold text-ink-800">{s}</td>
                  <td className="py-2.5 pr-4 font-black text-brand-700">{w}</td>
                  <td className="py-2.5 text-ink-500">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
          Already-revised topics are multiplied by 0.35. When time runs short, topics are also scored on{' '}
          <strong>marks per minute</strong>. Under 24 hours, Emergency Mode multiplies weak+important topics by 1.18 and
          cuts low-value ones by 55%.
        </p>
      </section>

      {/* ------------------------------------------------------- actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link to="/topics" className="btn-ghost">← Edit topics</Link>
        <button className="btn-primary !px-7 !py-3.5 text-base" onClick={generatePlan} disabled={busy}>
          {busy ? <><Spinner /> Building your schedule…</> : 'Generate my revision plan →'}
        </button>
      </div>

      {/* ------------------------------------------------------- detail */}
      <Modal open={!!openTopic} onClose={() => setOpenTopic(null)} title={openTopic?.name} size="md">
        {openTopic && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Priority score</div>
                <div className="text-3xl font-extrabold tabular-nums text-ink-900">{Math.round(openTopic.priorityScore)}<span className="text-sm text-ink-400">/100</span></div>
              </div>
              <PriorityBadge level={openTopic.priorityLevel} score={openTopic.priorityScore} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">Why this ranking</h4>
              <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900">
                {openTopic.priorityReason}
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Signal breakdown</h4>
              <SignalBars signals={workspace?.topics?.find((t) => t.id === openTopic.id)?.signals || openTopic.signals} placement={placement} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Difficulty', openTopic.difficulty],
                ['Importance', openTopic.importance],
                ['Confidence', `${openTopic.confidence}%`],
                ['Est. time', `${openTopic.estimatedMinutes} min`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-ink-50 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{l}</div>
                  <div className="font-bold capitalize text-ink-900">{v}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              <strong>Recommended:</strong> {openTopic.recommendedMinutes} minutes in one focused block.
            </div>

            <Link to={`/study/${openTopic.id}`} className="btn-primary w-full !py-3">
              Start revision on this topic →
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
