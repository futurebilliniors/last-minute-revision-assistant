import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { api } from '../api/client.js'
import { useTheme } from '../store/theme.js'
import { goalWords, Spinner } from './ui.jsx'

const shortId = (id) => (id ? String(id).replace(/-/g, '').slice(0, 8) : '')

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-lg font-black leading-none text-ink-900">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-ink-400">{hint}</div>}
    </div>
  )
}

/** Corner account menu: identity, revision-plan count and activity. */
export default function ProfileMenu() {
  const { user, logout } = useApp()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function load() {
    setLoading(true)
    setErr(null)
    try { setData(await api.get('/profile')) } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  function toggleOpen() {
    setOpen((v) => {
      const next = !v
      if (next && !data && !loading) load()
      return next
    })
  }

  const current = data?.plans?.current
  const words = goalWords(current?.goalType || 'exam')
  const stats = data?.stats
  const initials = (user?.name || '?').trim().slice(0, 1).toUpperCase()

  return (
    <div className="relative shrink-0" ref={wrap}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile and account"
        title={user?.email}
        className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-black text-white transition hover:brightness-110"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Profile"
          className="absolute right-0 top-11 z-50 w-[19.5rem] overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-lift animate-pop"
        >
          {/* identity */}
          <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-black text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-ink-900">{user?.name || '—'}</div>
              <div className="truncate text-xs text-ink-500" title={user?.email}>{user?.email || '—'}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 !text-[9px]">
                  ID {shortId(user?.id)}
                </span>
                <span className="text-[10px] text-ink-400">
                  {data?.user?.provider === 'google' ? 'Google account' : 'Email account'}
                </span>
              </div>
            </div>
          </div>

          {/* plans */}
          <div className="px-4 py-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Revision plans</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-black leading-none text-ink-900">
                    {loading && !data ? '…' : data?.plans?.total ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-500">
                    {data ? `${data.plans.exam} exam · ${data.plans.placement} placement` : ''}
                  </span>
                </div>
              </div>
              {data?.readiness?.score != null && (
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{words.readiness}</div>
                  <div className="text-lg font-black leading-none text-brand-700">{data.readiness.score}</div>
                </div>
              )}
            </div>

            {current && (
              <div className="mt-2.5 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
                <div className="truncate text-xs font-bold text-ink-800">{current.examName}</div>
                <div className="mt-0.5 text-[11px] text-ink-500">
                  {current.goalType === 'placement' ? 'Placement sprint' : 'Exam plan'} · {current.examDate}
                </div>
              </div>
            )}
          </div>

          {/* activity */}
          <div className="border-t border-ink-100 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Activity</div>
            {err ? (
              <p className="mt-2 text-xs text-critical">{err}</p>
            ) : loading && !data ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-500"><Spinner size={14} /> Loading stats…</div>
            ) : stats ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Topics" value={stats.topics} hint={`${stats.topicsDone} revised`} />
                <Stat label="Sessions" value={stats.sessionsDone} hint={`of ${stats.sessions}`} />
                <Stat label="Quizzes" value={stats.quizzes} hint={stats.avgAccuracy == null ? 'no attempts yet' : `${stats.avgAccuracy}% avg`} />
                <Stat label="Study time" value={`${Math.round((stats.minutes / 60) * 10) / 10}h`} hint={`${stats.events} tracked events`} />
              </div>
            ) : null}
          </div>

          {/* footer */}
          <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              onClick={() => logout?.()}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              ↩ Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
