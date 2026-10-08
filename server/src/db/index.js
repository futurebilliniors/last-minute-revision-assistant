import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', '..', 'data')
const DB_PATH = join(DATA_DIR, 'app.db')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

const MIGRATION = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  exam_name TEXT NOT NULL, exam_date TEXT NOT NULL, exam_time TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'exam',
  hours_per_day REAL NOT NULL DEFAULT 4, session_length_min INTEGER NOT NULL DEFAULT 45,
  break_duration_min INTEGER NOT NULL DEFAULT 15, study_start_time TEXT NOT NULL DEFAULT '09:00',
  timezone_offset INTEGER NOT NULL DEFAULT 0, emergency_mode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY, exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE, name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3563f5', position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'medium',
  importance TEXT NOT NULL DEFAULT 'medium', confidence INTEGER NOT NULL DEFAULT 50,
  estimated_minutes INTEGER NOT NULL DEFAULT 45, previous_score INTEGER,
  notes TEXT, position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', priority_score REAL NOT NULL DEFAULT 0,
  priority_level TEXT NOT NULL DEFAULT 'medium', priority_reason TEXT NOT NULL DEFAULT '',
  recommended_minutes INTEGER NOT NULL DEFAULT 45, confidence_before INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL,
  day_index INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
  priority TEXT, reason TEXT, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  total INTEGER NOT NULL, correct INTEGER NOT NULL, accuracy REAL NOT NULL,
  confidence_after INTEGER, answers TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS revision_progress (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  event TEXT NOT NULL, detail TEXT, minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_topics_exam   ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_subjects_exam ON subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exam ON study_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quiz_results(topic_id);
CREATE INDEX IF NOT EXISTS idx_progress_exam ON revision_progress(exam_id);
`

db.exec(MIGRATION)

// Schema version guard:
//   v1 had no foreign keys            → rebuild so cascades actually apply
//   v3 added exams.goal_type          → additive ALTER, existing data kept
const SCHEMA_VERSION = 3
const currentVersion = Number(db.prepare('PRAGMA user_version').get()?.user_version ?? 0)
if (currentVersion < 2) {
  db.exec(`
    DROP TABLE IF EXISTS revision_progress;
    DROP TABLE IF EXISTS quiz_results;
    DROP TABLE IF EXISTS study_sessions;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS exams;
    DROP TABLE IF EXISTS users;
  `)
  db.exec(MIGRATION)
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
} else if (currentVersion < SCHEMA_VERSION) {
  const cols = db.prepare(`PRAGMA table_info(exams)`).all().map((c) => c.name)
  if (!cols.includes('goal_type')) db.exec(`ALTER TABLE exams ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'exam'`)
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}

/** Run a statement with parameters. Returns { changes, lastInsertRowid }. */
export function run(sql, params = []) {
  const stmt = db.prepare(sql)
  return stmt.run(...params)
}

/** Fetch a single row (or undefined). */
export function get(sql, params = []) {
  return db.prepare(sql).get(...params)
}

/** Fetch all rows. */
export function all(sql, params = []) {
  return db.prepare(sql).all(...params)
}

export const uid = () => randomUUID()

/** Convert a SQLite row into a camelCase, typed-ish object for the API. */
export function mapTopic(row) {
  if (!row) return null
  return {
    id: row.id,
    subjectId: row.subject_id,
    examId: row.exam_id,
    name: row.name,
    difficulty: row.difficulty,
    importance: row.importance,
    confidence: row.confidence,
    estimatedMinutes: row.estimated_minutes,
    previousScore: row.previous_score ?? null,
    notes: row.notes ?? null,
    position: row.position,
    status: row.status,
    priorityScore: row.priority_score,
    priorityLevel: row.priority_level,
    priorityReason: row.priority_reason,
    recommendedMinutes: row.recommended_minutes,
    confidenceBefore: row.confidence_before ?? null,
  }
}

export function mapSubject(row) {
  if (!row) return null
  return {
    id: row.id,
    examId: row.exam_id,
    name: row.name,
    color: row.color,
    position: row.position,
  }
}

export function mapExam(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    studentName: row.student_name,
    examName: row.exam_name,
    goalType: row.goal_type === 'placement' ? 'placement' : 'exam',
    examDate: row.exam_date,
    examTime: row.exam_time,
    hoursPerDay: row.hours_per_day,
    sessionLengthMin: row.session_length_min,
    breakDurationMin: row.break_duration_min,
    studyStartTime: row.study_start_time,
    emergencyMode: !!row.emergency_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
