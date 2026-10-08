import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useApp, useReveal } from '../store/AppContext.jsx'
import { api } from '../api/client.js'
import { ThemeToggle } from '../components/ui.jsx'

const PROBLEM = [
  {
    icon: '⏳',
    title: 'Time is almost gone',
    body: 'A night is not enough to cover the whole syllabus. What you pick first decides your marks.',
  },
  {
    icon: '🎲',
    title: 'You revise the easy stuff',
    body: 'Comfort topics feel productive. Meanwhile the high-weightage chapters you keep failing go untouched.',
  },
  {
    icon: '🧭',
    title: 'No system tells you why',
    body: 'A list is not a plan. You need a ranked order, a reason for it, and a clock that fits it.',
  },
]

const FEATURES = [
  { icon: '🎯', title: 'AI Priority Engine', body: 'Scores every topic on importance, confidence, past performance, difficulty and exam proximity — then ranks them.' },
  { icon: '📅', title: 'Time-boxed plan', body: 'Your 8 hours become real sessions with breaks, quizzes, practice blocks and a final mock test.' },
  { icon: '▶️', title: 'Study This Now', body: 'One card, one answer: the exact topic to open next, how many minutes, and why.' },
  { icon: '📝', title: 'Adaptive quizzes', body: 'Score badly and the topic jumps the queue. Score well and its time is redirected to weaker areas.' },
  { icon: '📉', title: 'Exam Readiness Score', body: 'A 0–100 score with a written explanation of every component that produced it.' },
  { icon: '🚨', title: 'Emergency Mode', body: 'Under 24 hours? Low-value topics are cut automatically and the plan goes high-impact only.' },
  { icon: '💼', title: 'Placement Sprint', body: 'The same engine for internships and campus rounds — aptitude, DSA, core subjects and HR prep, ranked.' },
  { icon: '💬', title: 'Revision Copilot', body: 'Ask “what do I revise with 2 hours left?” and get an answer built from your real scores.' },
]

const STEPS = [
  { n: '01', t: 'Tell us the constraints', d: 'Exam date, hours per day, session length, subjects.' },
  { n: '02', t: 'Add your topics', d: 'Difficulty, importance, confidence, past score — or generate them with AI.' },
  { n: '03', t: 'Get a ranked plan', d: 'Every topic scored 0–100 with a reason, then scheduled to the minute.' },
  { n: '04', t: 'Revise and adapt', d: 'Quizzes update your scores; the plan reorders itself automatically.' },
]

const LEVELS = [
  ['CRITICAL', '#ef4444', 'rgb(var(--critical))', 'Do this first'],
  ['HIGH', '#f97316', 'rgb(var(--high))', 'Do this today'],
  ['MEDIUM', '#eab308', 'rgb(var(--medium))', 'Schedule it'],
  ['LOW', '#22c55e', 'rgb(var(--low))', 'Only if time allows'],
]

export default function Landing() {
  useReveal()
  const { user, setUser, refresh } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    document.title = 'Last Minute Revision Assistant — Revise smarter'
  }, [])

  async function startDemo() {
    setBusy(true)
    setErr(null)
    try {
      const { user } = await api.post('/auth/demo')
      setUser(user)
      await refresh({ silent: true })
      nav('/dashboard', { replace: true })
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ---------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">L</div>
            <span className="text-sm font-extrabold tracking-tight text-ink-900">
              Last Minute Revision <span className="text-ink-400">Assistant</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard" className="btn-primary">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
                <Link to="/setup" className="btn-primary">Create my plan</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55] dark:hidden"
          style={{
            background:
              'radial-gradient(600px 320px at 15% 0%, #dbe6ff 0%, transparent 60%), radial-gradient(700px 380px at 85% 20%, #ffe4d6 0%, transparent 55%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden opacity-[0.5] dark:block"
          style={{
            background:
              'radial-gradient(600px 320px at 15% 0%, #1d3071 0%, transparent 60%), radial-gradient(700px 380px at 85% 20%, #5b2b16 0%, transparent 55%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip ring-1 ring-inset ring-brand-200 bg-brand-50 text-brand-700 animate-fadeUp">
              Built for the last 48 hours
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl animate-fadeUp">
              Last Minute
              <span className="block bg-gradient-to-r from-brand-600 via-brand-500 to-high bg-clip-text text-transparent">
                Revision Assistant
              </span>
            </h1>
            <p className="mt-5 text-lg font-semibold text-ink-600 animate-fadeUp sm:text-xl">
              Revise smarter. Prioritize what matters most.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-500 animate-fadeUp">
              When time is short, <strong className="text-ink-700">what</strong> you study,{' '}
              <strong className="text-ink-700">when</strong> you study it, and{' '}
              <strong className="text-ink-700">why</strong> — decide your marks. This app analyses your exam date, hours,
              subjects, difficulty, confidence and past scores, then tells you exactly what to open first.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fadeUp">
              <Link to="/setup" className="btn-primary w-full !px-7 !py-3.5 text-base sm:w-auto">
                Create My Revision Plan →
              </Link>
              <button onClick={startDemo} disabled={busy} className="btn-ghost w-full !px-7 !py-3.5 text-base sm:w-auto">
                {busy ? 'Loading demo…' : '▶  Try the live demo'}
              </button>
            </div>
            {err && (
              <p className="mt-4 text-sm font-medium text-red-600" role="alert">
                {err}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-400">
              Demo loads 3 subjects · 15 topics · 8 study hours · exam tomorrow
            </p>
          </div>

          {/* ------------------------------------------- plan preview */}
          <div className="mx-auto mt-14 max-w-4xl animate-fadeUp">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Today’s optimized plan
                </span>
              </div>
              <div className="divide-y divide-ink-100">
                {[
                  { t: '10:00 – 10:45', n: 'Probability', p: 'critical', r: '35% confidence + high weightage + previous score 38%' },
                  { t: '10:45 – 11:00', n: 'Break', p: 'break' },
                  { t: '11:00 – 11:45', n: 'Organic Reaction Mechanisms', p: 'high', r: 'Difficult + 41% previous score' },
                  { t: '11:45 – 12:00', n: 'Quick revision quiz', p: 'quiz' },
                ].map((row) => (
                  <div key={row.t} className="flex items-start gap-4 px-4 py-3.5">
                    <span className="w-28 shrink-0 pt-0.5 font-mono text-xs font-semibold text-ink-400">{row.t}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            row.p === 'critical' ? 'bg-critical' : row.p === 'high' ? 'bg-high' : row.p === 'break' ? 'bg-ink-300' : 'bg-brand-500'
                          }`}
                        />
                        <span className="truncate text-sm font-bold text-ink-900">{row.n}</span>
                        {row.p === 'critical' && (
                          <span className="chip bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">CRITICAL</span>
                        )}
                      </div>
                      {row.r && <p className="mt-1 text-xs text-ink-500">{row.r}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- problem */}
      <section className="border-t border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">The problem</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink-900">
              Students waste their last night revising the wrong topics
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
              Not because they are lazy — because nothing tells them what actually matters most, with the hours they have
              left.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {PROBLEM.map((p) => (
              <div key={p.title} className="card reveal p-6">
                <div className="text-3xl" aria-hidden="true">{p.icon}</div>
                <h3 className="mt-4 text-base font-bold text-ink-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-8 rounded-2xl border border-brand-100 bg-brand-50/70 p-6 text-center sm:p-8">
            <p className="text-lg font-bold text-brand-900 sm:text-xl">
              The solution: rank every topic by <em>marks per minute</em> you have left.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-800/80">
              High weightage + low confidence + poor past score + exam is close = do it now. Easy, familiar, low-weightage
              = only if time allows.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {LEVELS.map(([label, color, textColor, hint]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-xs font-bold shadow-sm"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <span style={{ color: textColor }}>{label}</span>
                  <span className="font-medium text-ink-400">{hint}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ features */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">What you get</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink-900">One question, answered properly</h2>
            <p className="mt-3 text-[15px] text-ink-500">
              “Given my remaining time, what should I revise, when, and why?”
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card reveal p-6 transition hover:-translate-y-1 hover:shadow-lift">
                <div className="text-2xl" aria-hidden="true">{f.icon}</div>
                <h3 className="mt-3 text-[15px] font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- placement */}
      <section className="relative overflow-hidden border-t border-ink-100 bg-gradient-to-br from-brand-50 via-surface to-orange-50/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
              Placement Sprint · for college students
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink-900">
              Internship & placement prep, ranked the same way
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
              Campus rounds are an exam with a different syllabus. Enter your interview date, daily hours and what you’re
              actually weak at — the priority engine ranks aptitude, DSA, core subjects and HR prep, and the countdown
              runs to your interview, not to a semester end.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { i: '🧠', t: 'Aptitude & Logical', b: 'Percentages, TSD, DI, series — drilled timed, because online tests cut off at speed.' },
              { i: '🧩', t: 'DSA & Problem Solving', b: 'Arrays, hashing, trees, graphs and DP by pattern — with complexity stated out loud.' },
              { i: '🖥️', t: 'Core CS Fundamentals', b: 'OS, DBMS, networks and OOP — the questions every technical round actually asks.' },
              { i: '🗣️', t: 'Interview & HR', b: 'STAR stories, resume walkthrough, “why this company” — scheduled like any other topic.' },
            ].map((c) => (
              <div key={c.t} className="card reveal p-5 transition hover:-translate-y-1 hover:shadow-lift">
                <div className="text-2xl" aria-hidden="true">{c.i}</div>
                <h3 className="mt-3 text-[15px] font-bold text-ink-900">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{c.b}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-surface p-6 sm:flex-row">
            <div>
              <p className="text-base font-extrabold text-ink-900">Interview in 3 days and no plan yet?</p>
              <p className="mt-1 text-sm text-ink-500">
                Pick the placement track on setup — 4 starter subjects, AI topic generation, ranked plan, mock rounds.
              </p>
            </div>
            <Link to="/setup?track=placement" className="btn-primary shrink-0 !px-6">
              Start a placement sprint →
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- steps */}
      <section className="border-t border-ink-100 bg-night py-16 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold">From blank page to ranked plan in 4 steps</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="reveal">
                <div className="text-4xl font-black text-brand-500">{s.n}</div>
                <h3 className="mt-3 text-base font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-12 flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-lg font-extrabold">Your exam is already counting down.</p>
              <p className="mt-1 text-sm text-ink-300">Set it up in 2 minutes — or load the full demo in one click.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link to="/setup" className="btn-primary !px-6">Create My Revision Plan</Link>
              <button onClick={startDemo} disabled={busy} className="btn-ghost !border-white/25 !bg-transparent !text-white hover:!bg-white/10">
                {busy ? 'Loading…' : 'Live demo'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Last Minute Revision Assistant</span>
          <span>Revise smarter. Prioritize what matters most.</span>
        </div>
      </footer>
      </main>
    </div>
  )
}
