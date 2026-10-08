/**
 * Shared exam-creation service used by both the API setup route and
 * the seeder, so there is exactly one code path that writes an exam.
 */

import { randomUUID } from 'node:crypto'
import { get, run, mapTopic } from '../db/index.js'
import { regeneratePlan, getTopics, getQuizzes } from './workspace.js'

const COLORS = ['#3563f5', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444']

const clamp = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}
const pick = (v, allowed, dflt) => {
  const s = String(v || '').toLowerCase()
  return allowed.includes(s) ? s : dflt
}

export function createExamFromPayload(userId, payload) {
  const examId = randomUUID()

  run(
    `INSERT INTO exams
     (id, user_id, student_name, exam_name, exam_date, exam_time, hours_per_day,
      session_length_min, break_duration_min, study_start_time, goal_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      examId,
      userId,
      String(payload.studentName || '').trim(),
      String(payload.examName || '').trim(),
      payload.examDate,
      payload.examTime || '09:00',
      Number(payload.hoursPerDay) || 4,
      Number(payload.sessionLengthMin) || 45,
      Number(payload.breakDurationMin) ?? 15,
      payload.studyStartTime || '09:00',
      payload.goalType === 'placement' ? 'placement' : 'exam',
    ]
  )

  let topicCount = 0
  ;(payload.subjects || []).forEach((subject, si) => {
    const subjectId = randomUUID()
    run('INSERT INTO subjects (id, exam_id, name, color, position) VALUES (?,?,?,?,?)', [
      subjectId,
      examId,
      String(subject.name).trim(),
      subject.color || COLORS[si % COLORS.length],
      si,
    ])
    ;(subject.topics || []).forEach((t, ti) => {
      run(
        `INSERT INTO topics
         (id, subject_id, exam_id, name, difficulty, importance, confidence,
          estimated_minutes, previous_score, notes, position, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          subjectId,
          examId,
          String(t.name).trim(),
          pick(t.difficulty, ['easy', 'medium', 'hard'], 'medium'),
          pick(t.importance, ['low', 'medium', 'high'], 'medium'),
          clamp(t.confidence, 0, 100, 50),
          clamp(t.estimatedMinutes, 5, 300, 45),
          t.previousScore == null || t.previousScore === '' ? null : clamp(t.previousScore, 0, 100, null),
          t.notes ? String(t.notes) : null,
          ti,
          t.status === 'done' ? 'done' : 'pending',
        ]
      )
      topicCount++
    })
  })

  // Replay demo quiz attempts so charts and readiness have real data.
  for (const q of payload._demoQuizzes || []) {
    const subject = (payload.subjects || []).find((s) => s.name === q.subject)
    const topic = (subject?.topics || []).find((t) => t.name === q.topic)
    if (!topic) continue
    const row = getTopics(examId).find((t) => t.name === topic.name)
    if (!row) continue
    const accuracy = Math.round((q.correct / q.total) * 100)
    run(
      'INSERT INTO quiz_results (id, exam_id, topic_id, total, correct, accuracy, confidence_after, answers) VALUES (?,?,?,?,?,?,?,?)',
      [randomUUID(), examId, row.id, q.total, q.correct, accuracy, row.confidence, '[]']
    )
    run(
      'INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)',
      [randomUUID(), examId, row.id, 'quiz', `Quiz ${q.correct}/${q.total} (${accuracy}%)`, 0]
    )
  }

  // Mark topics flagged as done in the payload.
  for (const subject of payload.subjects || []) {
    for (const t of subject.topics || []) {
      if (t.status !== 'done') continue
      const row = getTopics(examId).find((x) => x.name === t.name)
      if (!row) continue
      run('UPDATE topics SET status = ? WHERE id = ?', ['done', row.id])
      run('INSERT INTO revision_progress (id, exam_id, topic_id, event, detail, minutes) VALUES (?,?,?,?,?,?)', [
        randomUUID(), examId, row.id, 'completed', row.name, row.estimatedMinutes,
      ])
    }
  }

  regeneratePlan(examId)
  return { examId, topics: topicCount }
}
