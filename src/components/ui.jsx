import { createContext, useContext, useEffect, useId, useState } from 'react'
import { useTheme } from '../store/theme.js'

/* ============================================================== tracks */

/**
 * Track-aware wording. The whole engine is shared between exam revision
 * and placement/interview prep — only the nouns change.
 */
export function goalWords(goalType) {
  const p = goalType === 'placement'
  return {
    placement: p,
    readiness: p ? 'Interview readiness' : 'Exam readiness',
    beforeStart: p ? 'before the interview' : 'before exam starts',
    toGo: p ? 'h to interview' : 'h to exam',
    ready: p ? 'How ready am I for the interview?' : 'How ready am I for the exam?',
    setup: p ? 'Set up your placement sprint' : 'Set up your exam',
  }
}

/** Light/dark switch — sun in dark mode, moon in light mode. */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-base text-ink-600 transition hover:border-ink-300 hover:text-ink-900 ${className}`}
    >
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
    </button>
  )
}

/* ============================================================== atoms */

export function Spinner({ size = 18, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}

export function LoadingBlock({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-surface/60 px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-bold text-ink-800">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span aria-hidden="true">⚠️</span>
      <div className="flex-1">{children}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost !py-1 !px-2.5 !text-xs">
          Retry
        </button>
      )}
    </div>
  )
}

/* ============================================================== badges */

export const LEVEL_META = {
  critical: { label: 'CRITICAL', className: 'bg-red-50 text-red-700 ring-red-200', dot: '#ef4444' },
  high: { label: 'HIGH', className: 'bg-orange-50 text-orange-700 ring-orange-200', dot: '#f97316' },
  medium: { label: 'MEDIUM', className: 'bg-yellow-50 text-yellow-700 ring-yellow-200', dot: '#eab308' },
  low: { label: 'LOW', className: 'bg-green-50 text-green-700 ring-green-200', dot: '#22c55e' },
}

export function PriorityBadge({ level = 'medium', score, size = 'md' }) {
  const meta = LEVEL_META[level] || LEVEL_META.medium
  return (
    <span
      className={`chip ring-1 ring-inset ${meta.className} ${size === 'sm' ? '!text-[10px]' : ''}`}
      title={`Priority ${level}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
      {meta.label}
      {score != null && <span className="font-black">{Math.round(score)}</span>}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600',
    blue: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-yellow-50 text-yellow-800',
    red: 'bg-red-50 text-red-700',
  }
  return <span className={`chip ring-1 ring-inset ring-black/5 ${tones[tone]}`}>{children}</span>
}

/* ============================================================ display */

export function ProgressBar({ value = 0, tone, height = 8, showLabel = false, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const color = tone || (pct >= 75 ? '#22c55e' : pct >= 45 ? '#f97316' : '#ef4444')
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
          <span>{label}</span>
          <span className="font-semibold text-ink-700">{pct}%</span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-ink-100"
        style={{ height }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'progress'}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, icon, tone = 'blue', onClick }) {
  const tones = {
    blue: 'bg-brand-50 text-brand-700',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    slate: 'bg-ink-100 text-ink-600',
  }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`card group flex w-full items-center gap-3.5 p-4 text-left ${
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-lift' : ''
      }`}
    >
      {icon && (
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg ${tones[tone]}`}>
          <span aria-hidden="true">{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
        <div className="text-xl font-extrabold leading-tight text-ink-900">{value}</div>
        {sub && <div className="truncate text-xs text-ink-500">{sub}</div>}
      </div>
    </Comp>
  )
}

/* ============================================================ overlays */

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${widths[size]} max-h-[92vh] overflow-hidden rounded-t-2xl bg-surface shadow-lift animate-pop sm:rounded-2xl`}
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            ✕
          </button>
        </header>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-ink-100 px-5 py-4">{footer}</footer>}
      </div>
    </div>
  )
}

/* ============================================================= forms */

export function Field({ label, error, hint, children, required }) {
  const id = useId()
  const child = typeof children === 'function' ? children({ id, invalid: !!error }) : children
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-1 text-critical">*</span>}
        </label>
      )}
      {child}
      {error ? (
        <p className="error-text" role="alert">
          <span aria-hidden="true">●</span> {error}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  )
}

export function Select({ invalid, children, ...props }) {
  return (
    <div className="relative">
      <select className={`field appearance-none pr-9 ${invalid ? 'field-error' : ''}`} {...props}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">▾</span>
    </div>
  )
}

/* ============================================================= tabs */

const TabsContext = createContext(null)

export function Tabs({ value, onChange, children, className = '' }) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1 ${className}`} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function Tab({ id, children }) {
  const ctx = useContext(TabsContext)
  const active = ctx?.value === id
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx?.onChange(id)}
      className={`flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
        active ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
      }`}
    >
      {children}
    </button>
  )
}
