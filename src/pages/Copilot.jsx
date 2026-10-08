import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../store/AppContext.jsx'
import { Pill, Spinner, goalWords } from '../components/ui.jsx'

const SUGGESTIONS = [
  'What should I study next?',
  'I have only 2 hours left. What should I revise?',
  'Which topics can I skip?',
  'Explain this topic simply',
  'Give me 5 questions on this chapter',
  'How ready am I for the exam?',
  'Test me on this topic',
]

/* ----------------------------------------------- lightweight renderer */

function Rich({ text }) {
  const lines = String(text || '').split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1" />

        const bullet = /^[-*•]\s+/.test(trimmed)
        const isTitle = /^\*\*[^*]+\*\*$/.test(trimmed)
        const isCode = /^`[^`]+`$/.test(trimmed)

        const content = renderInline(trimmed.replace(/^[-*•]\s+/, ''))

        if (isCode) {
          return (
            <pre key={i} className="overflow-x-auto rounded-lg bg-night px-3.5 py-2.5 text-xs text-brand-300">
              {trimmed.slice(1, -1)}
            </pre>
          )
        }
        if (bullet) {
          return (
            <div key={i} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              <span className="min-w-0 flex-1">{content}</span>
            </div>
          )
        }
        return (
          <p key={i} className={isTitle ? 'text-[15px] font-bold text-ink-900' : 'text-ink-700'}>
            {content}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={m.index} className="font-bold text-ink-900">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) parts.push(<code key={m.index} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px] text-brand-700">{tok.slice(1, -1)}</code>)
    else parts.push(<em key={m.index} className="italic">{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/* ------------------------------------------------------------- page */

export default function Copilot() {
  const { workspace, aiStatus } = useApp()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi — I’m **Revision Copilot**. I can see your real topics, scores, confidence and the hours you have left.\n\nAsk me things like:\n- What should I study next?\n- I have only 2 hours left — what do I revise?\n- Which topics can I skip?\n- Explain this topic simply',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const stats = workspace?.stats
  const exam = workspace?.exam
  const g = goalWords(exam?.goalType)
  const suggestions = SUGGESTIONS.map((s) => (s === 'How ready am I for the exam?' ? g.ready : s)).concat(
    g.placement
      ? ['How should I prepare for my HR interview?', 'What should I revise before the aptitude round?']
      : []
  )

  async function send(text) {
    const message = (text ?? input).trim()
    if (!message || busy) return
    setInput('')
    setErr(null)
    setMessages((m) => [...m, { role: 'user', content: message }])
    setBusy(true)
    try {
      const out = await api.post('/ai/chat', { message })
      setMessages((m) => [...m, { role: 'assistant', content: out.reply, source: out.source }])
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-h-[820px] flex-col lg:h-[calc(100vh-7rem)]">
      {/* header */}
      <div className="card flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          ✦
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-ink-900">Revision Copilot</div>
          <div className="text-[11px] text-ink-500">
            {aiStatus
              ? aiStatus.mode === 'remote'
                ? 'Connected model · uses your live revision data'
                : 'Built-in engine · uses your live revision data'
              : 'Starting…'}
          </div>
        </div>
        {stats && (
          <div className="hidden gap-1.5 sm:flex">
            <Pill tone="blue">{stats.critical} critical</Pill>
            <Pill tone="amber">{stats.remaining} left</Pill>
            <Pill>{Math.round(workspace.analysis?.hoursLeft ?? 0)}{g.toGo}</Pill>
          </div>
        )}
      </div>

      {/* messages */}
      <div className="card mt-3 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeUp`}>
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-brand-600 text-white'
                    : 'rounded-bl-md border border-ink-100 bg-ink-50'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{m.content}</p>
                ) : (
                  <>
                    <Rich text={m.content} />
                    {m.source && (
                      <div className="mt-2.5">
                        <Pill tone={m.source === 'ai' ? 'blue' : 'neutral'}>
                          {m.source === 'ai' ? '✦ live model' : 'offline engine'}
                        </Pill>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start animate-fadeIn">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-ink-100 bg-ink-50 px-4 py-3">
                <Spinner size={14} />
                <span className="text-xs font-medium text-ink-500">Reading your data…</span>
              </div>
            </div>
          )}

          {err && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* suggestions */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={busy}
            className="shrink-0 rounded-full border border-ink-200 bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* input */}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={exam ? `Ask about your plan, ${exam.studentName?.split(' ')[0] || 'student'}…` : 'Ask a question…'}
          aria-label="Message the Revision Copilot"
          className="field !py-3"
          maxLength={2000}
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-primary !px-5 !py-3">
          {busy ? <Spinner /> : 'Send'}
        </button>
      </form>

      {!workspace?.topics?.length && (
        <p className="mt-2 text-center text-xs text-ink-400">
          Add topics first so I can answer with your real data. <Link to="/topics" className="font-semibold text-brand-700">Add topics →</Link>
        </p>
      )}
    </div>
  )
}
