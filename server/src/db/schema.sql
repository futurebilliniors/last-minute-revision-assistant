-- ============================================================
-- Last Minute Revision Assistant — PostgreSQL / Supabase schema
-- ------------------------------------------------------------
-- The runtime uses node:sqlite with an identical table layout so
-- the app runs with zero external services. Run this file against
-- a Postgres / Supabase instance to move to production storage.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'local',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name          TEXT NOT NULL,
  exam_name             TEXT NOT NULL,
  exam_date             TEXT NOT NULL,          -- YYYY-MM-DD
  exam_time             TEXT NOT NULL,          -- HH:MM (24h)
  goal_type             TEXT NOT NULL DEFAULT 'exam', -- exam | placement
  hours_per_day         REAL NOT NULL DEFAULT 4,
  session_length_min    INTEGER NOT NULL DEFAULT 45,
  break_duration_min    INTEGER NOT NULL DEFAULT 15,
  study_start_time      TEXT NOT NULL DEFAULT '09:00',
  timezone_offset       INTEGER NOT NULL DEFAULT 0,
  emergency_mode        INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id         TEXT PRIMARY KEY,
  exam_id    TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#3563f5',
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id                 TEXT PRIMARY KEY,
  subject_id         TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_id            TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  difficulty         TEXT NOT NULL DEFAULT 'medium',   -- easy | medium | hard
  importance         TEXT NOT NULL DEFAULT 'medium',   -- low | medium | high
  confidence         INTEGER NOT NULL DEFAULT 50,      -- 0..100
  estimated_minutes  INTEGER NOT NULL DEFAULT 45,
  previous_score     INTEGER,                          -- 0..100 or NULL
  notes              TEXT,
  position           INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending',  -- pending | done | skipped
  priority_score     REAL NOT NULL DEFAULT 0,
  priority_level     TEXT NOT NULL DEFAULT 'medium',
  priority_reason    TEXT NOT NULL DEFAULT '',
  recommended_minutes INTEGER NOT NULL DEFAULT 45,
  confidence_before  INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id           TEXT PRIMARY KEY,
  exam_id      TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id     TEXT REFERENCES topics(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL,                 -- study | break | quiz | practice | mock | final
  title        TEXT NOT NULL,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  day_index    INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  priority     TEXT,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' -- pending | done | skipped
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id            TEXT PRIMARY KEY,
  exam_id       TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id      TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  total         INTEGER NOT NULL,
  correct       INTEGER NOT NULL,
  accuracy      REAL NOT NULL,
  confidence_after INTEGER,
  answers       TEXT,                          -- JSON blob
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revision_progress (
  id           TEXT PRIMARY KEY,
  exam_id      TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id     TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,                  -- completed | quiz | confidence | plan_regen
  detail       TEXT,
  minutes      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topics_exam      ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_subjects_exam    ON subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exam    ON study_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic    ON quiz_results(topic_id);
CREATE INDEX IF NOT EXISTS idx_progress_exam    ON revision_progress(exam_id);
