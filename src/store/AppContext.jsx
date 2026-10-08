import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from '../api/client.js'

const AppContext = createContext(null)

let toastSeq = 0

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState(null)
  const [toasts, setToasts] = useState([])
  const [aiStatus, setAiStatus] = useState(null)
  const [planNotice, setPlanNotice] = useState(null)

  const timers = useRef(new Map())

  // ------------------------------------------------------- toasts
  const toast = useCallback((message, tone = 'info', ttl = 4200) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, tone }])
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
      timers.current.delete(id)
    }, ttl)
    timers.current.set(id, timer)
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  // -------------------------------------------------- workspace
  const refresh = useCallback(async (opts = {}) => {
    try {
      const data = await api.get('/workspace')
      setWorkspace(data)
      setBootError(null)
      return data
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setWorkspace(null)
      } else {
        setBootError(err.message)
      }
      return null
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      const { user } = await api.get('/auth/me')
      setUser(user)
      await refresh({ silent: true })
    } catch {
      setUser(null)
    } finally {
      setAuthChecked(true)
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    bootstrap()
    api.get('/ai/status').then(setAiStatus).catch(() => {})
  }, [bootstrap])

  // Expose a global re-fetch helper (used after every mutation).
  const mutate = useCallback(
    async (fn, { success, error } = {}) => {
      try {
        const out = await fn()
        await refresh({ silent: true })
        if (success) toast(success, 'success')
        return out
      } catch (err) {
        toast(error || err.message || 'Something went wrong', 'error')
        throw err
      }
    },
    [refresh, toast]
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    setUser(null)
    setWorkspace(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      authChecked,
      workspace,
      setWorkspace,
      loading,
      bootError,
      refresh,
      bootstrap,
      mutate,
      toast,
      toasts,
      dismissToast,
      aiStatus,
      planNotice,
      setPlanNotice,
      logout,
    }),
    [user, authChecked, workspace, loading, bootError, refresh, bootstrap, mutate, toast, toasts, dismissToast, aiStatus, planNotice, logout]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/* ---------------------------------------------------------- helpers */

/** Live countdown to the exam, re-rendering every second. */
export function useCountdown(exam) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!exam) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, urgent: false }

  const [h, m] = String(exam.examTime || '09:00').split(':').map(Number)
  const target = new Date(`${exam.examDate}T00:00:00`)
  target.setHours(h || 0, m || 0, 0, 0)
  const totalMs = Math.max(0, target.getTime() - Date.now())

  const days = Math.floor(totalMs / 864e5)
  const hours = Math.floor((totalMs % 864e5) / 36e5)
  const minutes = Math.floor((totalMs % 36e5) / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)

  return { days, hours, minutes, seconds, totalMs, urgent: totalMs <= 864e5, expired: totalMs === 0 }
}

/** Reveal-on-scroll for landing sections. */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
