import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { PriorityBadge, Spinner, EmptyState, Pill, ProgressBar, ErrorNote, goalWords } from '../components/ui.jsx'
import { ProgressRing } from '../components/charts.jsx'

const WHY_ICONS = ['◎', '⚑', '✎', '⏱']

export default function StudyNow() {
  const nav = useNavigate()
  const { workspace, refresh, toast } = useApp()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [starting, setStarting] = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/study/now')
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message))
    return () => { alive = false }
  }, [workspace?.topics])

  const exam = workspace?.exam
  const readiness = workspace?.readiness
  const stats = workspace?.stats

  if (err) return <ErrorNote onRetry={() => window.location.reload()}>{err}</ErrorNote>

  if (!data && !err) {
    return (
      <div className="card p-6">
        <div className="skeleton mb-3 h-6 w-48" />
        <div className="skeleton mb-3 h-28 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    )
  }

  if (!data?.topic) {
    return (
      <EmptyState
        icon="🎉"
        title="Everything is revised"
        body="You have no pending topics. Spend your remaining time on a mock test and a final formula-sheet pass."
        action={<Link to="/plan" className="btn-primary">Open my plan</Link>}
      />
    )
  }

  const t = data.topic

  const whys = [
    t.priorityReason,
    `Confidence is ${t.confidence}%${t.previousScore != null ? ` and your last score was ${t.previousScore}%` : ''}`,
    `${t.importance === 'high' ? 'High' : t.importance === 'medium' ? 'Medium' : 'Low'} weightage in ${data.subject || 'your exam'} — it is ${t.importance === 'high' ? 'frequently tested' : 'occasionally tested'}`,
    `Estimated ${t.estimatedMinutes} minutes · recommended block ${t.recommendedMinutes} minutes`,
  ].slice(0, 4)

  async function start() {
    setStarting(true)
    try {
      await api.post(`/study/topics/${t.id}/start`, { count: 8 })
      nav(`/study/${t.id}`)
    } catch (e) {
      toast(e.message, 'error')
      setStarting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ main card */}
      <section className="relative overflow-hidden card p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              t.priorityLevel === 'critical'
                ? 'radial-gradient(500px 240px at 100% 0%, #fee2e2 0%, transparent 60%)'
                : 'radial-gradient(500px 240px at 100% 0%, #ffedd5 0%, transparent 60%)',
          }}
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Study this now</span>
            <PriorityBadge level={t.priorityLevel} score={t.priorityScore} />
            {data.subject && (
              <Pill tone="blue">{data.subject}</Pill>
            )}
          </div>

          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">{t.name}</h2>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="text-4xl font-extrabold tabular-nums text-ink-900">{t.recommendedMinutes}</span>
              <span className="ml-1.5 text-sm font-semibold text-ink-500">minutes</span>
            </div>
            <div className="text-sm text-ink-500">
              <span className="font-bold text-ink-800">{Math.round(t.priorityScore)}</span>/100 priority score
            </div>
            <div className="text-sm text-ink-500">
              {data.totalPending} topic{data.totalPending === 1 ? '' : 's'} still pending
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Why?</h3>
            <ul className="mt-3 space-y-2.5">
              {whys.map((w, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    t.priorityLevel === 'critical' ? 'bg-red-50 text-critical' : 'bg-orange-50 text-high'
                  }`}>
                    {WHY_ICONS[i] || '•'}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{w}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={start} disabled={starting} className="btn-primary flex-1 !py-4 text-base">
              {starting ? <><Spinner /> Preparing your session…</> : '▶  Start Revision'}
            </button>
            <button
              className="btn-ghost !py-4"
              disabled={marking}
              onClick={async () => {
                setMarking(true)
                try {
                  await api.post(`/topics/${t.id}/complete`)
                  await refresh({ silent: true })
                  toast(`“${t.name}” marked as revised — priorities updated`, 'success')
                  const next = await api.get('/study/now')
                  setData(next)
                } catch (e) {
                  toast(e.message, 'error')
                } finally {
                  setMarking(false)
                }
              }}
            >
              {marking ? 'Saving…' : '✓ I’ve revised this'}
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* next up */}
        <section className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">Next in the queue</h3>
          {data.alternatives?.length ? (
            <ol className="mt-3 divide-y divide-ink-100">
              {data.alternatives.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="w-5 text-xs font-black text-ink-300">{i + 2}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-800">{a.name}</span>
                    <span className="block truncate text-xs text-ink-500">{a.priorityReason}</span>
                  </span>
                  <PriorityBadge level={a.priorityLevel} size="sm" />
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink-500">{a.recommendedMinutes} min</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Nothing else queued — you’re on the last topic.</p>
          )}
          <Link to="/analysis" className="btn-ghost mt-4 w-full">See full priority ranking</Link>
        </section>

        {/* readiness */}
        <section className="card flex flex-col items-center justify-center gap-4 p-5 text-center">
          <ProgressRing value={readiness?.score ?? 0} label={goalWords(exam?.goalType).readiness} />
          <div>
            <p className="text-sm font-bold text-ink-800">{readiness?.grade || 'Add topics to unlock'}</p>
            <p className="mt-1 text-xs text-ink-500">
              {stats?.completed}/{stats?.total} topics revised · {stats?.studyHoursRemaining}h left to study
            </p>
          </div>
          <div className="w-full">
            <ProgressBar
              value={((stats?.completed || 0) / Math.max(1, stats?.total || 1)) * 100}
              showLabel
              label="Syllabus covered"
            />
          </div>
          <Link to="/dashboard" className="btn-ghost w-full">Open dashboard</Link>
        </section>
      </div>
    </div>
  )
}
