/**
 * Client-side mirror of the demo payload.
 * Used by the "Load sample data" button on the setup screen so a
 * visitor can replay the hackathon story without typing anything.
 */

const DAY_MS = 864e5
const pad = (n) => String(n).padStart(2, '0')
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function tomorrow(offsetDays = 1) {
  return localKey(new Date(Date.now() + offsetDays * DAY_MS))
}

export function buildDemoPayloadClient() {
  return {
    goalType: 'exam',
    studentName: 'Aarav Sharma',
    examName: 'Semester Final Examination',
    examDate: tomorrow(1),
    examTime: '09:00',
    hoursPerDay: 8,
    sessionLengthMin: 45,
    breakDurationMin: 15,
    studyStartTime: '09:00',
    subjects: [
      { name: 'Mathematics', color: '#3563f5' },
      { name: 'Physics', color: '#f97316' },
      { name: 'Chemistry', color: '#22c55e' },
    ],
  }
}

/**
 * Placement / internship story: campus interview in 2 days,
 * 4 subjects, 16 topics across aptitude, DSA, core CS and HR.
 */
export function buildPlacementPayloadClient() {
  return {
    goalType: 'placement',
    studentName: 'Priya Nair',
    examName: 'Campus Placements — TCS Digital',
    examDate: localKey(new Date(Date.now() + 2 * DAY_MS)),
    examTime: '10:00',
    hoursPerDay: 6,
    sessionLengthMin: 50,
    breakDurationMin: 10,
    studyStartTime: '09:00',
    subjects: [
      {
        name: 'Aptitude & Logical',
        color: '#3563f5',
        topics: [
          { name: 'Percentages', difficulty: 'medium', importance: 'high', confidence: 45, estimatedMinutes: 40, previousScore: 52 },
          { name: 'Profit, Loss & Discounts', difficulty: 'medium', importance: 'high', confidence: 50, estimatedMinutes: 40, previousScore: 58 },
          { name: 'Time, Speed & Distance', difficulty: 'hard', importance: 'high', confidence: 30, estimatedMinutes: 50, previousScore: 38 },
          { name: 'Data Interpretation — Charts & Tables', difficulty: 'medium', importance: 'high', confidence: 42, estimatedMinutes: 45, previousScore: 47 },
        ],
      },
      {
        name: 'DSA & Problem Solving',
        color: '#f97316',
        topics: [
          { name: 'Arrays & Strings', difficulty: 'medium', importance: 'high', confidence: 60, estimatedMinutes: 40, previousScore: 66 },
          { name: 'Hashing & Hash Maps', difficulty: 'medium', importance: 'high', confidence: 48, estimatedMinutes: 35, previousScore: 55 },
          { name: 'Trees & BST', difficulty: 'hard', importance: 'high', confidence: 25, estimatedMinutes: 50, previousScore: 32 },
          { name: 'Graphs — BFS, DFS & Shortest Path', difficulty: 'hard', importance: 'medium', confidence: 30, estimatedMinutes: 55, previousScore: 35 },
          { name: 'Dynamic Programming Basics', difficulty: 'hard', importance: 'medium', confidence: 20, estimatedMinutes: 60, previousScore: 28 },
        ],
      },
      {
        name: 'Core CS Fundamentals',
        color: '#22c55e',
        topics: [
          { name: 'DBMS & SQL Queries', difficulty: 'medium', importance: 'high', confidence: 55, estimatedMinutes: 45, previousScore: 62 },
          { name: 'Operating Systems — Scheduling', difficulty: 'medium', importance: 'high', confidence: 40, estimatedMinutes: 40, previousScore: 46 },
          { name: 'Computer Networks & OSI Model', difficulty: 'easy', importance: 'medium', confidence: 65, estimatedMinutes: 35, previousScore: 70, status: 'done' },
          { name: 'Object Oriented Programming', difficulty: 'easy', importance: 'high', confidence: 72, estimatedMinutes: 35, previousScore: 78, status: 'done' },
        ],
      },
      {
        name: 'Interview & HR',
        color: '#a855f7',
        topics: [
          { name: 'Tell Me About Yourself', difficulty: 'easy', importance: 'high', confidence: 55, estimatedMinutes: 15 },
          { name: 'STAR Behavioural Stories', difficulty: 'medium', importance: 'high', confidence: 35, estimatedMinutes: 40 },
          { name: 'Projects & Resume Walkthrough', difficulty: 'hard', importance: 'high', confidence: 40, estimatedMinutes: 45 },
          { name: 'Why This Company?', difficulty: 'medium', importance: 'medium', confidence: 60, estimatedMinutes: 20 },
        ],
      },
    ],
    _demoQuizzes: [
      { subject: 'Aptitude & Logical', topic: 'Percentages', correct: 5, total: 8 },
      { subject: 'DSA & Problem Solving', topic: 'Arrays & Strings', correct: 6, total: 8 },
      { subject: 'Core CS Fundamentals', topic: 'DBMS & SQL Queries', correct: 7, total: 8 },
    ],
  }
}
