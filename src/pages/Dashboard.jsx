import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { Countdown, EmergencyBanner } from '../components/Shell.jsx'
import { StatCard, PriorityBadge, ProgressBar, Pill, EmptyState, LoadingBlock, goalWords } from '../components/ui.jsx'
import { ProgressRing, LineChart, Donut, HBars } from '../components/charts.jsx'

export default function Dashboard() {
  const { workspace, loading, user } = useApp()
  const nav = useNavigate()

  if (loading || !workspace) return <LoadingBlock rows={5} />

  const { exam, readiness, stats, plan, nowTopic, subjects, quizzes, topics } = workspace
  if (!exam) return <EmptyState icon="🗓️" title="No exam yet" action={<Link to="/setup" className="btn-primary">Set up your exam</Link>} />
  const g = goalWords(exam.goalType)

  const today = plan?.days?.[0]
  const todaySessions = today?.sessions?.filter((s) => s.kind !== 'break') || []
  const trend = quizzes.length
    ? quizzes.slice(-8).map((q, i) => ({ label: `Q${i + 1}`, value: q.accuracy }))
    : []

  const completedPct = stats.total ? (stats.completed / stats.total) * 100 : 0

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------- hero row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* countdown */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
                Welcome back, {user?.name?.split(' ')[0] || 'student'}
              </p>
              <h2 className="mt-1.5 text-2xl font-extrabold text-ink-900">{exam.examName}</h2>
              <p className="mt-1 text-sm text-ink-500">
                {subjects.length} subjects · {stats.total} topics · {stats.studyHoursTotal}h of material
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Countdown exam={exam} />
          </div>
        </div>

        {/* readiness */}
        <div className="card flex flex-col items-center justify-center gap-3 p-5 text-center">
          <ProgressRing value={readiness?.score ?? 0} label={g.readiness} size={140} />
          <p className="text-sm font-bold text-ink-800">{readiness?.grade}</p>
          <Link to="/progress" className="btn-ghost w-full !text-xs">See how it’s calculated</Link>
        </div>
      </div>

      {/* ------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Topics done" value={`${stats.completed}/${stats.total}`} sub={`${Math.round(completedPct)}% covered`} icon="✓" tone="green" />
        <StatCard label="Remaining" value={stats.remaining} sub={`${stats.studyHoursRemaining}h of study`} icon="⏳" tone="orange" onClick={() => nav('/topics')} />
        <StatCard label="Critical" value={stats.critical} sub="do these first" icon="🔴" tone="red" onClick={() => nav('/analysis')} />
        <StatCard label="High priority" value={stats.high} sub="do today" icon="🟠" tone="yellow" onClick={() => nav('/analysis')} />
        <StatCard label="Hours left" value={`${Math.round(workspace.analysis?.hoursLeft ?? 0)}h`} sub={g.beforeStart} icon="⏱" tone="slate" />
        <StatCard
          label="Quiz average"
          value={stats.avgQuiz == null ? '—' : `${stats.avgQuiz}%`}
          sub={`${quizzes.length} attempt${quizzes.length === 1 ? '' : 's'}`}
          icon="🎯"
          tone={stats.avgQuiz == null ? 'slate' : stats.avgQuiz >= 70 ? 'green' : 'red'}
          onClick={() => nav('/progress')}
        />
      </div>

      {/* ------------------------------------------------- study now */}
      {nowTopic && (
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Current topic</span>
                <PriorityBadge level={nowTopic.priorityLevel} score={nowTopic.priorityScore} />
              </div>
              <h3 className="mt-1.5 truncate text-xl font-extrabold text-ink-900">{nowTopic.name}</h3>
              <p className="mt-1 text-sm text-ink-500">{nowTopic.priorityReason}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Pill>{nowTopic.recommendedMinutes} min</Pill>
                <Pill>conf {nowTopic.confidence}%</Pill>
                <Pill>{nowTopic.difficulty}</Pill>
              </div>
            </div>
            <Link to="/now" className="btn-primary shrink-0 !px-6 !py-3">
              ▶ Study this now
            </Link>
          </div>
        </section>
      )}

      {/* ------------------------------------------------- plan + readiness */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{today?.label || 'Today'}</div>
              <h3 className="text-lg font-extrabold text-ink-900">Today’s revision plan</h3>
            </div>
            <Link to="/plan" className="btn-ghost !py-1.5 !text-xs">Full plan →</Link>
          </div>

          {todaySessions.length ? (
            <ol className="divide-y divide-ink-100">
              {todaySessions.slice(0, 6).map((s, i) => (
                <li key={s.id || i} className={`flex items-start gap-3 py-3 ${s.priority ? `priority-bar p-${s.priority} pl-4 relative` : ''}`}>
                  <span className="w-[92px] shrink-0 font-mono text-xs font-bold tabular-nums text-ink-500">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink-900">{s.title}</span>
                      {s.priority && <PriorityBadge level={s.priority} size="sm" />}
                      {s.status === 'done' && <Pill tone="green">✓</Pill>}
                    </span>
                    {s.reason && <span className="mt-0.5 block text-xs text-ink-500">{s.reason}</span>}
                  </span>
                </li>
              ))}
              {todaySessions.length > 6 && (
                <li className="pt-3 text-center text-xs text-ink-400">
                  + {todaySessions.length - 6} more blocks today
                </li>
              )}
            </ol>
          ) : (
            <p className="text-sm text-ink-500">
              No sessions scheduled yet. <Link to="/plan" className="font-semibold text-brand-700">Generate your plan →</Link>
            </p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Readiness breakdown</h3>
          <div className="mt-4 space-y-4">
            {(readiness?.components || []).map((c) => (
              <ProgressBar key={c.key} value={c.value} showLabel label={c.label} />
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-ink-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
            <strong className="text-ink-700">Formula:</strong> {readiness?.explanation}
          </p>
        </section>
      </div>

      {/* ------------------------------------------------- charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Quiz performance trend</h3>
            <Pill tone={stats.avgQuiz >= 70 ? 'green' : 'amber'}>
              avg {stats.avgQuiz ?? '—'}%
            </Pill>
          </div>
          {trend.length > 1 ? (
            <LineChart points={trend} title="Quiz accuracy over attempts" />
          ) : trend.length === 1 ? (
            <div className="rounded-xl bg-ink-50 px-4 py-8 text-center text-sm text-ink-500">
              First attempt recorded at <strong>{trend[0].value}%</strong>. Take another quiz to see the trend.
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
              No quizzes yet.{' '}
              <Link to="/now" className="font-semibold text-brand-700 hover:underline">
                Start a revision session
              </Link>{' '}
              to unlock your trend.
            </div>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Coverage</h3>
          <div className="mt-4 flex items-center justify-center">
            <Donut
              size={132}
              centerLabel={`${Math.round(completedPct)}%`}
              centerSub="revised"
              segments={[
                { label: 'Revised', value: stats.completed, color: '#22c55e' },
                { label: 'Pending', value: stats.remaining, color: '#eceef6' },
              ]}
            />
          </div>
          <div className="mt-4 space-y-2.5">
            {subjects.slice(0, 5).map((s) => {
              const list = topics.filter((t) => t.subjectId === s.id)
              const done = list.filter((t) => t.status === 'done').length
              return (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-ink-600">{s.name}</span>
                    <span className="font-bold text-ink-800">{done}/{list.length}</span>
                  </div>
                  <ProgressBar value={list.length ? (done / list.length) * 100 : 0} tone={s.color} height={6} />
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ------------------------------------------------- strong / weak */}
      {(readiness?.strong?.length || readiness?.attention?.length) > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-green-700">
              ✓ Strong areas
            </h3>
            <ul className="mt-3 space-y-2">
              {(readiness.strong || []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-4 py-2.5">
                  <span className="truncate text-sm font-semibold text-green-900">{t.name}</span>
                  <span className="shrink-0 text-xs font-bold text-green-700">{t.confidence}%</span>
                </li>
              ))}
              {!readiness.strong.length && <li className="text-sm text-ink-500">No strong areas yet — start revising.</li>}
            </ul>
          </section>

          <section className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-critical">
              ⚠ Needs attention
            </h3>
            <ul className="mt-3 space-y-2">
              {(readiness.attention || []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-2.5">
                  <span className="truncate text-sm font-semibold text-red-900">{t.name}</span>
                  <span className="shrink-0 text-xs font-bold text-red-700">{t.confidence}%</span>
                </li>
              ))}
              {!readiness.attention.length && <li className="text-sm text-ink-500">Nothing flagged. Keep it up.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
