import { useCallback, useEffect, useState } from 'react'

/** Light/dark theme with a shared module state (no context needed:
 *  only one page shell is mounted at a time). */
const KEY = 'lmra-theme'
let current = null
const listeners = new Set()

function readInitial() {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(theme) {
  const dark = theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = theme
}

function commit(theme) {
  current = theme
  try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  applyTheme(theme)
  listeners.forEach((fn) => fn(theme))
}

export function useTheme() {
  const [theme, setLocal] = useState(() => {
    if (current === null) current = readInitial()
    return current
  })

  useEffect(() => {
    if (current === null) { current = readInitial(); applyTheme(current) }
    listeners.add(setLocal)
    return () => listeners.delete(setLocal)
  }, [])

  const toggle = useCallback(() => {
    commit((current ?? readInitial()) === 'dark' ? 'light' : 'dark')
  }, [])

  return { theme, toggle }
}
