/**
 * ============================================================
 *  AI SERVICE LAYER
 * ============================================================
 *  Single, clean seam between the app and any LLM.
 *
 *  • No key configured  → fully offline deterministic engine (default).
 *                         The demo works with zero network access.
 *  • AI_PROVIDER set    → server-side HTTP call to the provider.
 *
 *  The key is only ever read from server env (process.env). There is
 *  no VITE_ prefixed variable anywhere in this project, so the key can
 *  never be bundled into frontend code.
 * ============================================================
 */

import { localGenerateTopics, localExplain, localQuestions, localAnswer } from './localEngine.js'
import { remoteComplete, hasRemoteProvider } from './remoteProvider.js'

const withTimeout = async (fn, ms, label) => {
  let timer
  try {
    return await Promise.race([
      fn(),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error(`${label} timed out`)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Should we attempt a real model call? */
export const aiMode = () => (hasRemoteProvider() ? 'remote' : 'local')

async function complete(system, user, opts = {}) {
  if (!hasRemoteProvider()) return null
  try {
    const out = await withTimeout(
      () => remoteComplete(system, user, opts),
      opts.timeout ?? 18000,
      'AI request'
    )
    return out
  } catch (err) {
    // Degrade gracefully — never break the product because a key is bad.
    console.warn(`[ai] remote provider failed (${err.message}); using offline engine`)
    return null
  }
}

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Extract the first JSON object/array from a model response. */
function extractJSON(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = [fenced?.[1], text]
  for (const c of candidates) {
    if (!c) continue
    const obj = c.match(/\{[\s\S]*\}/)?.[0]
    const arr = c.match(/\[[\s\S]*\]/)?.[0]
    for (const s of [obj, arr]) {
      const parsed = safeParse(s)
      if (parsed) return parsed
    }
  }
  return null
}

// ---------------------------------------------------------------- topics

/**
 * Suggest syllabus topics for a subject.
 * @returns {Array<{name,difficulty,importance,estimatedMinutes,previousScore,confidence}>}
 */
export async function generateTopics({ subjectName, syllabus = '', examName = '', count = 8 }) {
  const system =
    'You are a senior exam coach. Return ONLY valid JSON, no prose.'
  const user = `Suggest ${count} high-yield exam topics for the subject "${subjectName}"${
    examName ? ` for the exam "${examName}"` : ''
  }.
${syllabus ? `Syllabus notes: ${syllabus}` : ''}
Return: {"topics":[{"name":string,"difficulty":"easy"|"medium"|"hard","importance":"low"|"medium"|"high","estimatedMinutes":number,"confidence":number}]}
confidence must be a realistic guess (0-100) for an average student.`

  const remote = await complete(system, user, { json: true })
  const parsed = extractJSON(remote)
  if (parsed && Array.isArray(parsed.topics) && parsed.topics.length) {
    return normalizeTopics(parsed.topics, count)
  }
  return localGenerateTopics({ subjectName, syllabus, examName, count })
}

function normalizeTopics(list, count) {
  return list
    .slice(0, count)
    .map((t, i) => ({
      name: String(t.name || `Topic ${i + 1}`).slice(0, 120),
      difficulty: ['easy', 'medium', 'hard'].includes(t.difficulty) ? t.difficulty : 'medium',
      importance: ['low', 'medium', 'high'].includes(t.importance) ? t.importance : 'medium',
      estimatedMinutes: clampInt(t.estimatedMinutes, 10, 240, 45),
      confidence: clampInt(t.confidence, 0, 100, 50),
      previousScore: t.previousScore == null ? null : clampInt(t.previousScore, 0, 100, null),
    }))
    .filter((t) => t.name.trim().length > 1)
}

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}

// ------------------------------------------------------------ study note

/** Concise revision sheet for one topic. */
export async function explainTopic({ topic, subjectName }) {
  const system = 'You are an expert tutor. Be concise, accurate and exam-focused.'
  const user = `Create a compact revision sheet for "${topic.name}" (${subjectName || 'General'}).
Difficulty: ${topic.difficulty}. Importance: ${topic.importance}. Student confidence: ${topic.confidence}%. Previous score: ${topic.previousScore ?? 'n/a'}.
Return ONLY JSON:
{"summary":string,"keyPoints":string[4-6],"formulas":[{"formula":string,"meaning":string}],"mistakes":string[3-4],"example":{"problem":string,"solution":string}}`

  const remote = await complete(system, user, { json: true })
  const parsed = extractJSON(remote)
  if (parsed && parsed.summary) {
    return {
      ...parsed,
      keyPoints: (parsed.keyPoints || []).slice(0, 6),
      formulas: (parsed.formulas || []).slice(0, 6),
      mistakes: (parsed.mistakes || []).slice(0, 4),
      source: 'ai',
    }
  }
  return { ...localExplain(topic, subjectName), source: 'offline' }
}

// -------------------------------------------------------------- questions

export async function generateQuestions({ topic, subjectName, count = 8 }) {
  const system = 'You are an exam question writer. Return ONLY valid JSON.'
  const user = `Write ${count} exam-style questions on "${topic.name}" (${subjectName || 'General'}).
Difficulty: ${topic.difficulty}. Confidence: ${topic.confidence}%.
Return ONLY JSON: {"questions":[{"q":string,"options":string[4],"answer":number,"why":string}]}
"answer" is the 0-based index of the correct option. "why" is a one-line explanation.`

  const remote = await complete(system, user, { json: true })
  const parsed = extractJSON(remote)
  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
    const cleaned = parsed.questions
      .map((q) => ({
        q: String(q.q || ''),
        options: (q.options || []).map(String),
        answer: Number(q.answer),
        why: String(q.why || ''),
      }))
      .filter((q) => q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
      .slice(0, count)
    if (cleaned.length) return { questions: cleaned, source: 'ai' }
  }
  return { questions: localQuestions(topic, subjectName, count), source: 'offline' }
}

// ----------------------------------------------------------------- copilot

/**
 * Revision Copilot — answers using the student's REAL data.
 * The context (topics, scores, time left) is injected server-side.
 */
export async function answerCopilot({ message, context }) {
  const facts = context.summary || ''
  const system = `You are "Revision Copilot" inside a last-minute ${context.goalType === 'placement' ? 'placement/interview preparation' : 'exam revision'} app.
You have the student's real data. Be direct, specific and numeric. Use short paragraphs or bullets.
Always answer with a concrete next action (topic name + minutes) when asked what to study.`
  const user = `${facts}\n\nStudent message: ${message}`

  const remote = await complete(system, user, {})
  if (remote && remote.trim().length > 20) return { reply: remote.trim(), source: 'ai' }

  return { reply: localAnswer(message, context), source: 'offline' }
}

export default { generateTopics, explainTopic, generateQuestions, answerCopilot, aiMode }
