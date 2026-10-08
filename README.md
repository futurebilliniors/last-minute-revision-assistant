# Last Minute Revision Assistant

> **Revise smarter. Prioritize what matters most.**

An AI-powered revision planner that answers one question properly:

> _Given my exam date, my hours, my subjects and my actual confidence — **what** should I study now, **when** should I study it, and **why**?_

![stack](https://img.shields.io/badge/React%2018-Vite%205-blue) ![stack](https://img.shields.io/badge/Express%204-Node%2024-black) ![stack](https://img.shields.io/badge/Tailwind%203-design%20system-38bdf8)

---

## Quick start

```bash
npm install
npm run dev          # API on :3001 + web on :5173
```

Open **http://localhost:5173**.

### Two ways to see it working

| | |
|---|---|
| **One-click demo** | Landing page → *“Try the live demo”* → lands on the dashboard with a full dataset |
| **Demo credentials** | `demo@revision.app` / `demo1234` |

### Production build (single port)

```bash
npm run build        # Vite → /dist
npm start            # Express serves API + static app on :3001
```

### Tests

```bash
npm start            # in another terminal
node scripts/e2e.mjs # 99 assertions covering the whole demo story
```

---

## The hackathon story

1. Student has an exam **tomorrow at 09:00**, **8 study hours/day**.
2. Enters **3 subjects** and **15 topics** with difficulty, importance, confidence and past scores.
3. The **AI Priority Engine** ranks all 15 with a score (0–100), a level (CRITICAL/HIGH/MEDIUM/LOW) and a written reason.
4. An optimized **time-boxed plan** is generated: study blocks, breaks, quick quizzes, practice sets, final revision, mock test.
5. Student opens **“Study This Now”** → **Start Revision** → reads the sheet → answers 8 MCQs.
6. The quiz result **changes the priority score**, the message reads *“Your plan has been updated based on your performance”*, and the schedule re-optimizes itself.
7. The dashboard shows the **Exam Readiness Score** with a written breakdown of how it was calculated.

Under 24 hours, **Emergency Mode** switches on automatically: low-value topics are cut, weak-but-important topics are boosted, and the plan goes high-impact only.

---

## Placement Sprint (internships, campus rounds, interviews)

The same engine also serves college students preparing for **internships and job interviews** — pick the
**Placement / interview** track on the setup screen (or open `/setup?track=placement`).

| | Exam track | Placement track |
|---|---|---|
| Target date | exam date/time | interview / aptitude-test date |
| Starter subjects | Mathematics | Aptitude & Logical · DSA & Problem Solving · Core CS Fundamentals · Interview & HR |
| AI topic presets | maths, physics, chemistry, CS | + aptitude (percentages, TSD, DI…), DSA (arrays, trees, graphs, DP…), HR (STAR stories, resume walkthrough…) |
| Revision sheets & MCQs | exam content bank | + aptitude, DSA, DBMS/SQL, OS, networks and HR/behavioural banks |
| Wording | “Exam starts in…”, *High exam weightage* | “Interview starts in…”, *High interview weightage* |
| Copilot | “How ready am I for the exam?” | “How should I prepare for my HR interview?” |

The priority maths, scheduling, readiness score, Emergency Mode and adaptive plan are **unchanged** — only the
content and the labels differ. Both tracks are selected via `exams.goal_type` (`exam` | `placement`), so a student
can switch tracks later from setup without losing anything.

---

## Dark mode & profile menu

- **Theme** — one `dark` class on `<html>` flips the whole palette through CSS variables
  (`:root` / `.dark` in `src/index.css`, consumed by `tailwind.config.js` as `rgb(var(--…) / <alpha-value>)`).
  The choice is stored in `localStorage` and applied by an inline script in `index.html` **before first paint**
  (no flash), defaulting to the OS preference. Toggle with the ☀️/🌙 button in the header or inside the profile menu.
  Solid buttons (`.btn-primary`, `.btn-danger`) use explicit non-flipping colour pairs so white text keeps
  clearing WCAG contrast in both themes; chart chrome uses `--chart-*` variables.
- **Profile corner menu** — the avatar in the top-right corner opens the account panel: name, email, short user ID,
  plan count (exam + placement), the active plan, readiness and live activity stats (topics revised, sessions done,
  quizzes + average accuracy, hours studied). Served by `GET /api/profile`.

---

## How the AI Priority Engine works

Every topic gets a 0–100 score from six weighted signals:

| Signal | Weight | Meaning |
|---|---|---|
| **Importance** | 30% | Exam weightage of the topic |
| **Confidence gap** | 22% | `100 − confidence`. Low confidence = urgent |
| **Past performance** | 18% | `100 − last score`. Untested topics use a neutral 65% |
| **Difficulty** | 12% | Hard topics need more reps to stick |
| **Exam proximity** | 12% | Sharpens as the exam approaches |
| **Time fit** | 6% | Whether it fits one session cleanly |

**Modifiers**

- `status = done` → ×0.35 (urgency mostly gone)
- Time poverty (< 40h left) → re-weighted by **marks per minute**
- **Emergency Mode** (< 24h) → weak + important ×1.18, low-value ×0.45, previous score < 50% ×1.10

Then: `recommendedMinutes` is fitted to the student’s session length, and the scheduler books them in order.

This is deliberately **not** alphabetical and **not** difficulty-only — a hard topic the student already masters ranks low; an easy topic they keep failing ranks high.

### Scheduling rules

- Study block → break → study block → break…
- Every 3rd block → **quick revision quiz** (active recall)
- Every 5th block → **practice questions**
- Last block of each day → **final revision / formula sheet**
- A **full mock test** is appended only when there is real runway left
- Nothing is ever scheduled past `exam time − 45 min`
- Topics that don’t fit are listed explicitly as *deferred / skippable* with advice

### Exam Readiness Score

```
25% syllabus revised (weighted by importance)
25% confidence      (weighted by importance)
25% quiz performance (weighted accuracy, neutral 50% until attempted)
15% critical topics secured
10% time adequacy   (remaining hours vs remaining work)
```

The UI prints this exact formula so the number is never a black box.

---

## AI service layer

All model access lives in **one seam**: `server/src/services/ai/index.js`.

```
generateTopics()   explainTopic()   generateQuestions()   answerCopilot()
        │
        ├─ remote  → server/src/services/ai/remoteProvider.js   (fetch to provider)
        └─ local   → server/src/services/ai/localEngine.js      (offline, default)
```

- **No key configured → the offline engine runs.** It ships a curated content bank (probability, matrices, calculus, statistics, algebra, physics, chemistry, algorithms), a syllabus-aware topic generator, an 8-question bank per topic, and a Copilot that reads the student's **real** data. The full demo works with zero network access.
- **Key configured → remote model is used**, and any failure silently degrades back to the offline engine.

```bash
# .env  (server-side only)
AI_PROVIDER=openai          # openai | anthropic | openrouter
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

> 🔒 **The key never reaches the browser.** There is no `VITE_*` key anywhere in this repo, and every AI call goes through `/api/ai/*` on the server.

---

## Database

Runtime storage is **`node:sqlite`** (built into Node 24) so the app runs with **no external services** — no Docker, no hosted Postgres, nothing to configure for a demo.

The full **PostgreSQL / Supabase DDL** is in [`server/src/db/schema.sql`](server/src/db/schema.sql) — run it against a Supabase project to move to production storage. The table layout is identical.

| Table | Stores |
|---|---|
| `users` | account, hashed password (bcrypt), provider |
| `exams` | target date/time, **`goal_type` (exam \| placement)**, hours/day, session & break length, emergency flag |
| `subjects` | subject names + colours |
| `topics` | difficulty, importance, confidence, estimate, past score, **priority score/level/reason** |
| `study_sessions` | the time-boxed plan (start, end, kind, priority, reason) |
| `quiz_results` | total, correct, accuracy, confidence after, per-question detail |
| `revision_progress` | every completed/quiz/confidence/session event |

**Authentication** is email + password (bcrypt + JWT in an `httpOnly` cookie). Google OAuth is intentionally not wired up — it needs client credentials you'd have to supply; drop it into `server/src/routes/auth.js` alongside the local strategies when you have them.

---

## API reference

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` · `/demo` | auth |
| GET | `/api/auth/me` | current user |
| GET | `/api/profile` | account identity, **revision-plan count**, activity stats, readiness |
| POST | `/api/setup` | create exam + subjects + topics (first plan generated immediately) |
| GET | `/api/workspace` | **everything**: exam, subjects, topics w/ scores, plan, readiness, stats |
| PUT | `/api/exam` | edit setup |
| POST | `/api/subjects` · `/api/subjects/:id/topics` | add subject / topics |
| DELETE | `/api/topics/:id` | remove topic |
| POST | `/api/topics/:id/complete` · `/confidence` | mark revised / re-rate confidence |
| GET | `/api/readiness` · `/api/progress` | readiness breakdown · charts & history |
| GET | `/api/plan` · `/api/plan/explanation` | schedule · why it looks like this |
| POST | `/api/plan/regenerate` · `/api/plan/sessions/:id/complete` | rebuild · tick a block |
| GET | `/api/study/now` | **“Study This Now”** |
| POST | `/api/study/topics/:id/start` | revision sheet + 8 questions |
| POST | `/api/study/topics/:id/quiz` | score → **priority + plan update** |
| POST | `/api/ai/generate-topics` | “Generate topics using AI” |
| POST | `/api/ai/chat` | Revision Copilot |
| GET | `/api/ai/status` · `/api/health` | engine mode · health |

Errors always come back as `{ error }` or `{ errors: { field: message } }` so forms can render them inline.

---

## Project layout

```
├── index.html                 Vite entry
├── vite.config.js             dev proxy → :3001
├── tailwind.config.js         design tokens + motion
├── server/
│   ├── start.js               production bootstrap (NODE_ENV=production)
│   └── src/
│       ├── index.js           Express app, static /dist, error handlers
│       ├── seed.js            demo account (demo@revision.app / demo1234)
│       ├── db/                node:sqlite driver + schema.sql (Postgres)
│       ├── middleware/auth.js  JWT + cookie
│       ├── routes/            auth · workspace · plan · study · ai
│       └── services/
│           ├── priorityEngine.js     ★ the ranking algorithm
│           ├── scheduleEngine.js     ★ time-boxed planner
│           ├── readinessEngine.js    ★ readiness score + trend
│           ├── workspace.js          aggregates everything for the client
│           ├── setupService.js       single exam-creation path
│           ├── demoData.js           hackathon dataset
│           └── ai/                   offline + remote providers
├── src/
│   ├── App.jsx                routes + guards
│   ├── store/AppContext.jsx   auth, workspace, toasts, countdown hook
│   ├── api/client.js          fetch wrapper (no keys, ever)
│   ├── components/            Shell · ui (design system) · charts (SVG)
│   └── pages/                 Landing · Login · Setup · Topics · Analysis
│                              Plan · StudyNow · Revision · Dashboard
│                              Progress · Copilot
└── scripts/e2e.mjs            end-to-end API test suite
```

---

## Design system

| Level | Colour | Used for |
|---|---|---|
| CRITICAL | `#ef4444` red | do first |
| HIGH | `#f97316` orange | do today |
| MEDIUM | `#eab308` yellow | schedule it |
| LOW | `#22c55e` green | only if time allows |

- Cards, badges, progress bars, donut/ring/line/bar charts are all hand-built SVG — **no charting dependency**.
- Fully responsive: sidebar on desktop → top sheet + bottom tab bar on mobile.
- Accessible: focus-visible rings, `aria` on sliders/progress/dialogs, `role="alert"` on errors, `prefers-reduced-motion` respected.
- Loading skeletons, empty states, inline form validation, toast notifications and error-with-retry everywhere.

---

## Environment

| Var | Default | Notes |
|---|---|---|
| `PORT` | `3001` | |
| `JWT_SECRET` | dev fallback | **set this in production** |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` | — | optional; offline engine is the default |
