import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { EmptyState, Spinner, Pill, PriorityBadge, ErrorNote, Tabs, Tab } from '../components/ui.jsx'

const KIND = {
  study: { icon: '📘', label: 'Study' },
  break: { icon: '☕', label: 'Break' },
  quiz: { icon: '❓', label: 'Quick quiz' },
  practice: { icon: '✎', label: 'Practice' },
  mock: { icon: '🏁', label: 'Mock test' },
  final: { icon: '🔑', label: 'Final revision' },
}

function SessionRow({ s, subjects, onToggle }) {
  const meta = KIND[s.kind] || KIND.study
  const subject = subjects.find((x) => x.id === s.subjectId)
  const isBreak = s.kind === 'break'

  return (
    <li className={`relative flex items-start gap-3 px-4 py-3.5 sm:px-5 ${isBreak ? 'bg-ink-50/70' : ''} ${s.priority ? `priority-bar p-${s.priority}` : ''}`}>
      <div className="w-[104px] shrink-0 pt-0.5">
        <div className="font-mono text-[13px] font-bold tabular-nums text-ink-800">{s.startTime}</div>
        <div className="font-mono text-[11px] tabular-nums text-ink-400">{s.endTime}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-300">{s.mins} min</div>
      </div>

      <div className={`min-w-0 flex-1 ${isBreak ? 'opacity-70' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true">{meta.icon}</span>
          <span className={`text-sm font-bold ${isBreak ? 'text-ink-500' : 'text-ink-900'}`}>{s.title}</span>
          {s.status === 'done' && <Pill tone="green">✓ done</Pill>}
          {!isBreak && s.priority && <PriorityBadge level={s.priority} size="sm" />}
          {subject && s.kind === 'study' && (
            <span className="chip ring-1 ring-inset ring-ink-200" style={{ color: subject.color }}>
              {subject.name}
            </span>
          )}
        </div>
        {s.reason && <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.reason}</p>}
      </div>

      {!isBreak && onToggle && (
        <button
          onClick={() => onToggle(s)}
          aria-label={s.status === 'done' ? `Mark ${s.title} as not done` : `Mark ${s.title} done`}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs transition ${
            s.status === 'done'
              ? 'border-green-300 bg-green-500 text-white'
              : 'border-ink-200 text-ink-300 hover:border-green-300 hover:text-green-500'
          }`}
        >
          ✓
        </button>
      )}
    </li>
  )
}

export default function Plan() {
  const { workspace, refresh, toast, mutate, planNotice } = useApp()
  const [busy, setBusy] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [tab, setTab] = useState('0')

  const plan = workspace?.plan
  const subjects = workspace?.subjects || []
  const emergency = workspace?.analysis?.emergency

  useEffect(() => {
    if (plan?.days?.length && !plan.days.some((d) => d.key === tab)) setTab(plan.days[0].key)
  }, [plan, tab])

  useEffect(() => {
    api.get('/plan/explanation').then(setExplanation).catch(() => {})
  }, [plan?.stats?.generatedAt])

  async function regenerate() {
    setBusy(true)
    try {
      const out = await api.post('/plan/regenerate', {})
      await refresh({ silent: true })
      toast(`Plan rebuilt — ${out.plan?.stats?.totalHours ?? 0}h across ${out.plan?.days?.length ?? 0} day(s)`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleSession(s) {
    try {
      await api.post(`/plan/sessions/${s.id}/complete`)
      await refresh({ silent: true })
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  if (!plan || !plan.days?.length) {
    return (
      <EmptyState
        icon="🗓️"
        title="No plan yet"
        body="Your schedule will be built from your priorities, session length, breaks and the hours you have left."
        action={<button className="btn-primary" onClick={regenerate} disabled={busy}>{busy ? <Spinner /> : 'Generate my plan'}</button>}
      />
    )
  }

  const activeDay = plan.days.find((d) => d.key === tab) || plan.days[0]

  return (
    <div className="space-y-5">
      {planNotice && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 animate-fadeUp">
          <span aria-hidden="true">↻</span>
          <div className="flex-1">{planNotice}</div>
        </div>
      )}

      {/* ---------------------------------------------------- summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Study time', `${plan.stats.totalHours}h`, `${plan.stats.studyMinutes} minutes of focus`, '⏱'],
          ['Sessions', plan.stats.totalSessions, `${plan.stats.breakMinutes} min of breaks`, '▦'],
          ['Topics scheduled', plan.stats.topicsPlanned, `${plan.stats.topicsSkipped ?? 0} deferred`, '📘'],
          ['Days left', plan.days.length, emergency ? 'Emergency schedule' : 'Standard schedule', emergency ? '🚨' : '📅'],
        ].map(([l, v, s, i]) => (
          <div key={l} className="card p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              <span aria-hidden="true">{i}</span> {l}
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-ink-900">{v}</div>
            <div className="text-xs text-ink-500">{s}</div>
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------- controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onChange={setTab} className="sm:w-auto">
          {plan.days.map((d) => (
            <Tab key={d.key} id={d.key}>
              {d.label}
            </Tab>
          ))}
        </Tabs>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setShowWhy((v) => !v)}>
            {showWhy ? 'Hide' : 'Why this order?'}
          </button>
          <button className="btn-ghost" onClick={regenerate} disabled={busy}>
            {busy ? <Spinner /> : '↻ Re-optimize'}
          </button>
        </div>
      </div>

      {showWhy && explanation && (
        <section className="card animate-fadeUp p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Why the plan looks like this</h3>
          <ol className="mt-4 space-y-3">
            {explanation.order.map((t, i) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-ink-100 text-[11px] font-black text-ink-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{t.name}</span>
                    <PriorityBadge level={t.level} score={t.score} size="sm" />
                    <Pill>{t.minutes} min</Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{t.reason}</p>
                </div>
              </li>
            ))}
          </ol>
          {explanation.skipped?.length > 0 && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
              <strong>Deferred / skippable:</strong> {explanation.skipped.map((t) => t.name).join(', ')}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------- schedule */}
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{activeDay.label}</div>
            <h3 className="text-lg font-extrabold text-ink-900">
              {Math.round((activeDay.studyMinutes / 60) * 10) / 10} hours of focused study
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(KIND).map(([k, v]) =>
              activeDay.sessions.some((s) => s.kind === k) ? (
                <span key={k} className="chip bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200">
                  {v.icon} {v.label}
                </span>
              ) : null
            )}
          </div>
        </header>

        <ol className="divide-y divide-ink-100">
          {activeDay.sessions.map((s) => (
            <SessionRow key={s.id || s.position} s={s} subjects={subjects} onToggle={toggleSession} />
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------- skipped */}
      {plan.skipped?.length > 0 && (
        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Did not fit the schedule</h3>
          <ul className="mt-3 space-y-2.5">
            {plan.skipped.map((t) => (
              <li key={t.id} className="flex items-start gap-3 rounded-xl bg-ink-50 px-4 py-3">
                <PriorityBadge level={t.priorityLevel} size="sm" />
                <div>
                  <div className="text-sm font-bold text-ink-800">{t.name}</div>
                  <div className="text-xs text-ink-500">{t.advice}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex justify-between gap-3">
        <Link to="/analysis" className="btn-ghost">← Priority analysis</Link>
        <Link to="/now" className="btn-primary">Start studying →</Link>
      </div>
    </div>
  )
}
