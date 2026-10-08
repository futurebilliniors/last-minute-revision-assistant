import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { Field } from '../components/ui.jsx'

export default function Login() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { setUser, refresh, toast } = useApp()

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [general, setGeneral] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setGeneral(null)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const { user } = await api.post(path, form)
      setUser(user)
      await refresh({ silent: true })
      toast(mode === 'login' ? `Welcome back, ${user.name}` : 'Account created — let’s build your plan', 'success')
      nav(params.get('next') || '/setup', { replace: true })
    } catch (err) {
      setErrors(err.errors || {})
      if (!err.errors) setGeneral(err.message)
      setBusy(false)
    }
  }

  async function demo() {
    setBusy(true)
    setGeneral(null)
    try {
      const { user } = await api.post('/auth/demo')
      setUser(user)
      await refresh({ silent: true })
      nav('/dashboard', { replace: true })
    } catch (err) {
      setGeneral(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ------------------------------------------------------ aside */}
      <div className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(500px 300px at 20% 10%, #1b38b5 0%, transparent 60%)' }}
        />
        <Link to="/" className="relative flex items-center gap-2.5 text-sm font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black">L</span>
          Last Minute Revision Assistant
        </Link>

        <div className="relative mt-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">Revise smarter</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">
            Prioritize what
            <br />
            matters most.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            Your priority order, your time-boxed plan and your readiness score — all generated from the data you enter and
            updated every time you take a quiz.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-200">
            {['Priority score with a reason for every topic', 'Schedule that fits the hours you actually have', 'Adaptive quizzes that re-rank your plan'].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="text-brand-400" aria-hidden="true">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------- form */}
      <div className="flex items-center justify-center bg-ink-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">L</span>
            <span className="text-sm font-extrabold text-ink-900">Revision Assistant</span>
          </Link>

          <h2 className="text-2xl font-extrabold text-ink-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === 'login' ? 'Sign in to continue your revision plan.' : 'Two minutes and you have a ranked plan.'}
          </p>

          <div className="mt-6 space-y-4">
            {general && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {general}
              </div>
            )}

            <form onSubmit={submit} noValidate>
              {mode === 'register' && (
                <div className="mb-4">
                  <Field label="Your name" error={errors.name} required>
                    {({ id, invalid }) => (
                      <input
                        id={id}
                        className={`field ${invalid ? 'field-error' : ''}`}
                        value={form.name}
                        onChange={set('name')}
                        placeholder="Aarav Sharma"
                        autoComplete="name"
                      />
                    )}
                  </Field>
                </div>
              )}

              <div className="mb-4">
                <Field label="Email" error={errors.email} required>
                  {({ id, invalid }) => (
                    <input
                      id={id}
                      type="email"
                      className={`field ${invalid ? 'field-error' : ''}`}
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@college.edu"
                      autoComplete="email"
                    />
                  )}
                </Field>
              </div>

              <div className="mb-5">
                <Field label="Password" error={errors.password} required hint={mode === 'register' ? 'At least 6 characters.' : undefined}>
                  {({ id, invalid }) => (
                    <input
                      id={id}
                      type="password"
                      className={`field ${invalid ? 'field-error' : ''}`}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="••••••••"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  )}
                </Field>
              </div>

              <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-ink-300">
              <span className="h-px flex-1 bg-ink-200" /> or <span className="h-px flex-1 bg-ink-200" />
            </div>

            <button onClick={demo} disabled={busy} className="btn-ghost w-full !py-3">
              ▶  Continue with the demo account
            </button>

            <p className="text-center text-sm text-ink-500">
              {mode === 'login' ? 'No account yet? ' : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setGeneral(null) }}
                className="font-semibold text-brand-700 hover:underline"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
