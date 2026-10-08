import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { LoadingBlock, ErrorNote, EmptyState, Pill, ProgressBar, StatCard, goalWords } from '../components/ui.jsx'
import { LineChart, BarChart, Donut, HBars, ProgressRing } from '../components/charts.jsx'

const EVENT_META = {
  completed: ['✓', 'bg-green-50 text-green-700'],
  quiz: ['🎯', 'bg-brand-50 text-brand-700'],
  confidence: ['◍', 'bg-yellow-50 text-yellow-700'],
  session: ['⏱', 'bg-ink-100 text-ink-600'],
  reopened: ['↩', 'bg-orange-50 text-orange-700'],
}

export default function Progress() {
  const { workspace, loading } = useApp()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!workspace?.exam) return
    api.get('/progress')
      .then(setData)
      .catch((e) => setErr(e.message))
  }, [workspace?.exam, workspace?.quizzes?.length, workspace?.stats?.completed])

  if (loading) return <LoadingBlock rows={5} />
  if (err) return <ErrorNote onRetry={() => setData(null) || setErr(null)}>{err}</ErrorNote>
  if (!workspace?.exam) return <EmptyState icon="🗓️" title="No exam yet" action={<Link to="/setup" className="btn-primary">Set up your exam</Link>} />
  if (!data) return <LoadingBlock rows={4} />

  const { bySubject, quizzes, history, accuracyTrend, totals } = data
  const readiness = workspace.readiness
  const stats = workspace.stats
  const g = goalWords(workspace.exam?.goalType)

  const recent = [...quizzes].reverse().slice(0, 8)
  const historyEvents = [...history].reverse().slice(0, 25)

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------- top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Topics completed" value={`${totals.completed}/${totals.total}`} icon="✓" tone="green" />
        <StatCard label="Quiz attempts" value={totals.quizAttempts} sub={totals.avgAccuracy != null ? `avg ${totals.avgAccuracy}%` : 'no quizzes yet'} icon="🎯" tone="blue" />
        <StatCard label="Avg confidence" value={`${stats.avgConfidence}%`} sub="across all topics" icon="◍" tone="yellow" />
        <StatCard
          label="Time tracked"
          value={`${Math.round((totals.minutesTracked / 60) * 10) / 10}h`}
          sub="of logged study"
          icon="⏱"
          tone="slate"
        />
      </div>

      {/* ---------------------------------------------------- readiness */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing value={readiness.score} label={g.readiness} size={150} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">{g.readiness}</p>
            <h2 className="mt-1 text-xl font-extrabold text-ink-900">{readiness.grade}</h2>
            <p className="mt-3 text-sm font-semibold text-ink-600">How it was calculated</p>
            <p className="mt-1 font-mono text-xs text-ink-500">{readiness.explanation}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {readiness.strong.length > 0 && (
                <div className="rounded-xl bg-green-50 px-3.5 py-2.5 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-green-700">Strong areas</div>
                  <div className="mt-1 text-xs font-semibold text-green-900">
                    ✓ {readiness.strong.map((t) => t.name).join(' · ')}
                  </div>
                </div>
              )}
              {readiness.attention.length > 0 && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-600">Needs attention</div>
                  <div className="mt-1 text-xs font-semibold text-red-900">
                    ⚠ {readiness.attention.map((t) => t.name).join(' · ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Component scores</h3>
            <HBars
              data={readiness.components.map((c) => ({
                label: `${c.label} (${Math.round(c.weight * 100)}%)`,
                value: c.value,
                display: c.display,
                hint: c.hint,
                color: c.value >= 75 ? '#22c55e' : c.value >= 50 ? '#f97316' : '#ef4444',
              }))}
            />
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Accuracy over time</h3>
            {accuracyTrend.length > 1 ? (
              <LineChart points={accuracyTrend} title="Quiz accuracy trend" />
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
                Complete a second quiz to unlock the trend line.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- subjects */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Subject breakdown</h3>
          <Donut
            size={72}
            stroke={12}
            centerLabel={bySubject.length}
            centerSub="subjects"
            segments={bySubject.map((s) => ({ label: s.name, value: s.total, color: s.color }))}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bySubject.map((s) => (
            <div key={s.id} className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-bold text-ink-900">{s.name}</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={s.percent} tone={s.color} showLabel label="revised" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill>{s.completed}/{s.total} topics</Pill>
                <Pill tone={s.confidence >= 70 ? 'green' : s.confidence >= 45 ? 'amber' : 'red'}>conf {s.confidence}%</Pill>
                {s.avgScore != null && <Pill tone={s.avgScore >= 70 ? 'green' : 'amber'}>avg {s.avgScore}%</Pill>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Recent quiz accuracy</h3>
          <div className="mt-4">
            {recent.length ? (
              <BarChart
                title="Recent quiz scores"
                data={recent.map((q, i) => ({
                  label: `${q.topicName.split(' ')[0]} ${recent.length - i}`,
                  value: q.accuracy,
                  color: q.accuracy >= 75 ? '#22c55e' : q.accuracy >= 50 ? '#f97316' : '#ef4444',
                }))}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
                No quizzes taken yet.
              </div>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Completion by subject</h3>
          <div className="mt-5">
            <BarChart
              title="Topics revised per subject"
              data={bySubject.map((s) => ({ label: s.name, value: s.percent, color: s.color }))}
            />
          </div>
        </section>
      </div>

      {/* ---------------------------------------------------- history */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Quiz history</h3>
          {quizzes.length ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {[...quizzes].reverse().slice(0, 10).map((q) => {
                const topic = workspace.topics.find((t) => t.id === q.topicId)
                return (
                  <li key={q.id} className="flex items-center gap-3 py-2.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${
                      q.accuracy >= 75 ? 'bg-green-50 text-green-700' : q.accuracy >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {q.accuracy}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-800">{q.topicName}</span>
                      <span className="block text-xs text-ink-500">
                        {q.correct}/{q.total} correct · {new Date(q.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    {topic?.priorityLevel && (
                      <span className="chip ring-1 ring-inset ring-ink-200 text-ink-500">{topic.priorityLevel}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
              No quizzes yet — they update your priorities, so take one early.{' '}
              <Link to="/now" className="font-semibold text-brand-700 hover:underline">Start now →</Link>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Revision history</h3>
          {historyEvents.length ? (
            <ul className="mt-3 space-y-2">
              {historyEvents.map((h) => {
                const [icon, cls] = EVENT_META[h.event] || EVENT_META.session
                return (
                  <li key={h.id} className="flex items-start gap-3 rounded-xl bg-ink-50/70 px-3.5 py-2.5">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs ${cls}`}>{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-800">{h.detail}</span>
                      <span className="block text-[11px] text-ink-400">
                        {h.minutes > 0 ? `${h.minutes} min · ` : ''}
                        {new Date(h.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Your activity will appear here as you revise.</p>
          )}
        </section>
      </div>
    </div>
  )
}
