import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp, useCountdown } from '../store/AppContext.jsx'
import { ThemeToggle } from './ui.jsx'
import ProfileMenu from './ProfileMenu.jsx'

/* ------------------------------------------------------------- toasts */

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  const tones = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-brand-200 bg-brand-50 text-brand-800',
    warn: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  }
  const icons = { success: '✓', error: '!', info: 'i', warn: '⚠' }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lift animate-pop ${tones[t.tone] || tones.info}`}
        >
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-current/10 text-[10px] font-black">
            {icons[t.tone] || 'i'}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-0.5 px-1 text-current/50 hover:text-current"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- countdown */

export function Countdown({ exam, compact = false, asBlock = false }) {
  const { days, hours, minutes, seconds, urgent, expired } = useCountdown(exam)
  if (!exam) return null

  const placement = exam.goalType === 'placement'
  const heading = expired
    ? placement ? 'Interview has started' : 'Exam has started'
    : placement ? 'Interview starts in' : 'Exam starts in'
  const segs = [
    { v: days, l: days === 1 ? 'day' : 'days' },
    { v: hours, l: 'hr' },
    { v: minutes, l: 'min' },
    { v: seconds, l: 'sec' },
  ].filter((s, i) => !(compact && days === 0 && i > 1))

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
          urgent ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200' : 'bg-ink-100 text-ink-600'
        }`}
        title={new Date(`${exam.examDate}T${exam.examTime}`).toLocaleString()}
      >
        <span className={urgent ? 'animate-pulseSoft' : ''} aria-hidden="true">⏱</span>
        {expired ? 'LIVE' : `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`}
        <span className="sr-only">{`${heading} ${days} days ${hours} hours ${minutes} minutes`}</span>
      </div>
    )
  }

  return (
    <div className={asBlock ? 'card p-5' : ''}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${urgent ? 'bg-critical animate-pulseSoft' : 'bg-brand-500'}`} />
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{heading}</p>
      </div>
      <div className="mt-3 flex items-end gap-2" aria-live="off">
        {segs.map((s) => (
          <div key={s.l} className="text-center">
            <div
              className={`tabular-nums font-extrabold leading-none ${
                compact ? 'text-xl' : 'text-4xl sm:text-5xl'
              } ${urgent ? 'text-critical' : 'text-ink-900'}`}
            >
              {String(s.v).padStart(2, '0')}
            </div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">{s.l}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">
        {exam.examName} · {new Date(`${exam.examDate}T${exam.examTime}`).toLocaleString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}

/* ------------------------------------------------------ emergency bar */

export function EmergencyBanner({ exam }) {
  const { urgent, days } = useCountdown(exam)
  if (!exam || !urgent) return null
  return (
    <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden="true">🚨</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-800">
            {days === 0 ? 'Emergency Revision Mode is active' : 'You have limited time'}
          </p>
          <p className="mt-0.5 text-xs text-red-700">
            We've optimized your plan for maximum marks — low-value topics removed, only high-impact and weak-but-important
            topics kept, plus rapid revision, formulas and a final mock test.
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-critical via-high to-transparent" />
    </div>
  )
}

/* --------------------------------------------------------------- nav */

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/now', label: 'Study Now', icon: '▶' },
  { to: '/plan', label: 'Plan', icon: '▦' },
  { to: '/topics', label: 'Topics', icon: '≡' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/copilot', label: 'Copilot', icon: '✦' },
]

export function Shell({ children, title, subtitle, actions }) {
  const { user, workspace, logout, aiStatus } = useApp()
  const nav = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const exam = workspace?.exam

  useEffect(() => setMenuOpen(false), [location.pathname])

  const hasExam = !!exam

  return (
    <div className="min-h-screen bg-ink-50">
      {/* -------- sidebar (desktop) -------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink-100 bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-ink-100 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">L</div>
          <div className="leading-tight">
            <div className="text-[13px] font-extrabold text-ink-900">Revision Assistant</div>
            <div className="text-[10px] font-medium text-ink-400">Revise smarter</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                }`
              }
            >
              <span className="grid w-5 place-items-center text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-3">
          {exam && (
            <div className="mb-3 rounded-xl bg-ink-50 p-3">
              <Countdown exam={exam} compact />
            </div>
          )}
          <div className="flex items-center gap-2.5 px-1">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
              {(user?.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-ink-800">{user?.name}</div>
              <div className="truncate text-[10px] text-ink-400">
                {aiStatus ? (aiStatus.mode === 'remote' ? 'AI: connected' : 'AI: offline engine') : 'AI: …'}
              </div>
            </div>
            <button
              onClick={() => logout?.()}
              title="Sign out"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* -------- main -------- */}
      <div className="lg:pl-60">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-surface/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white lg:hidden">L</div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-extrabold text-ink-900 sm:text-lg">{title}</h1>
              {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
            </div>
            {exam && <Countdown exam={exam} compact />}
            <div className="flex items-center gap-2">{actions}</div>
            <ThemeToggle />
            <ProfileMenu />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-600 lg:hidden"
            >
              ☰
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-ink-100 bg-surface px-3 py-3 lg:hidden animate-fadeIn">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
                      }`
                    }
                  >
                    <span aria-hidden="true">{item.icon}</span> {item.label}
                  </NavLink>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); logout?.() }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
                >
                  <span aria-hidden="true">↩</span> Sign out
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {hasExam && <div className="mb-4"><EmergencyBanner exam={exam} /></div>}
          {children}
        </main>
      </div>

      {/* -------- bottom nav (mobile) -------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                  isActive ? 'text-brand-700' : 'text-ink-400'
                }`
              }
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
