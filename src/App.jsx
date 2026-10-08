import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './store/AppContext.jsx'
import { Toasts, Shell } from './components/Shell.jsx'
import { LoadingBlock, ErrorNote } from './components/ui.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Setup from './pages/Setup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import StudyNow from './pages/StudyNow.jsx'
import Plan from './pages/Plan.jsx'
import Topics from './pages/Topics.jsx'
import Analysis from './pages/Analysis.jsx'
import Revision from './pages/Revision.jsx'
import Progress from './pages/Progress.jsx'
import Copilot from './pages/Copilot.jsx'

const TITLES = {
  '/dashboard': ['Dashboard', 'Everything you need to know right now'],
  '/now': ['What should I study now?', 'The single highest-value thing you can do next'],
  '/plan': ['Your revision plan', 'Time-boxed sessions, breaks and practice — fitted to your hours'],
  '/topics': ['Topics & priorities', 'Add your syllabus, then let the AI rank it'],
  '/analysis': ['AI priority analysis', 'Why each topic is ranked the way it is'],
  '/progress': ['Progress tracking', 'Scores, confidence and time — measured over the run-up'],
  '/copilot': ['Revision Copilot', 'Ask anything about your real revision data'],
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  const { user, authChecked, workspace, loading, bootError, refresh } = useApp()
  const location = useLocation()

  if (!authChecked || (loading && user && !workspace)) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-xl font-black text-white">
            L
          </div>
          <p className="mb-4 text-sm font-semibold text-ink-500">Loading your revision workspace…</p>
          <div className="space-y-2.5">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5 mx-auto" />
            <div className="skeleton h-3 w-3/5 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // Route guards ----------------------------------------------------
  const isPublic = ['/', '/login'].includes(location.pathname)

  if (bootError && !isPublic) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 px-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="text-4xl" aria-hidden="true">🔌</div>
          <h1 className="text-lg font-extrabold">Connection problem</h1>
          <ErrorNote onRetry={refresh}>{bootError}</ErrorNote>
          <button className="btn-ghost" onClick={() => location.reload()}>
            Reload the page
          </button>
        </div>
      </div>
    )
  }

  const shell = (page, key) => {
    const [title, subtitle] = TITLES[key] || ['Last Minute Revision', '']
    return (
      <Shell title={title} subtitle={subtitle}>
        {page}
      </Shell>
    )
  }

  return (
    <>
      <ScrollToTop />
      <Toasts />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Require auth */}
        <Route
          path="/setup"
          element={
            user ? <Setup /> : <Navigate to="/login?next=/setup" replace />
          }
        />

        <Route
          path="/dashboard"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Dashboard />, '/dashboard')
            )
          }
        />
        <Route
          path="/now"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<StudyNow />, '/now')
            )
          }
        />
        <Route
          path="/plan"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Plan />, '/plan')
            )
          }
        />
        <Route
          path="/topics"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Topics />, '/topics')
            )
          }
        />
        <Route
          path="/analysis"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Analysis />, '/analysis')
            )
          }
        />
        <Route
          path="/progress"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Progress />, '/progress')
            )
          }
        />
        <Route
          path="/copilot"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              shell(<Copilot />, '/copilot')
            )
          }
        />
        <Route
          path="/study/:id"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !workspace?.exam ? (
              <Navigate to="/setup" replace />
            ) : (
              <Shell title="Revision mode" subtitle="Focused session with practice questions">
                <Revision />
              </Shell>
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
