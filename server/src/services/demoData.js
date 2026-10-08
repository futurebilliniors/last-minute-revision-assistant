/**
 * Hackathon demo dataset.
 *
 * Story: a student with an exam TOMORROW, 3 subjects, 15 topics,
 * 8 study hours/day, varied confidence and importance — the exact
 * scenario from the demo script.
 */

const DAY_MS = 864e5
const pad = (n) => String(n).padStart(2, '0')
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function tomorrow(offsetDays = 1) {
  const d = new Date(Date.now() + offsetDays * DAY_MS)
  return localKey(d)
}

export function buildDemoPayload() {
  return {
    studentName: 'Aarav Sharma',
    examName: 'Semester Final Examination',
    examDate: tomorrow(1),
    examTime: '09:00',
    hoursPerDay: 8,
    sessionLengthMin: 45,
    breakDurationMin: 15,
    studyStartTime: nextRoundHour(),
    subjects: [
      {
        name: 'Mathematics',
        color: '#3563f5',
        topics: [
          {
            name: 'Probability',
            difficulty: 'hard',
            importance: 'high',
            confidence: 32,
            estimatedMinutes: 60,
            previousScore: 38,
            notes: 'Conditional probability and Bayes theorem',
          },
          {
            name: 'Matrices & Determinants',
            difficulty: 'medium',
            importance: 'high',
            confidence: 55,
            estimatedMinutes: 45,
            previousScore: 62,
          },
          {
            name: 'Differential Calculus',
            difficulty: 'hard',
            importance: 'high',
            confidence: 44,
            estimatedMinutes: 60,
            previousScore: 47,
          },
          {
            name: 'Statistics & Distributions',
            difficulty: 'medium',
            importance: 'medium',
            confidence: 61,
            estimatedMinutes: 40,
            previousScore: 68,
          },
          {
            name: 'Algebra & Quadratic Equations',
            difficulty: 'easy',
            importance: 'medium',
            confidence: 78,
            estimatedMinutes: 30,
            previousScore: 84,
            status: 'done',
          },
        ],
      },
      {
        name: 'Physics',
        color: '#f97316',
        topics: [
          {
            name: 'Rotational Dynamics',
            difficulty: 'hard',
            importance: 'high',
            confidence: 28,
            estimatedMinutes: 60,
            previousScore: 34,
          },
          {
            name: 'Current Electricity',
            difficulty: 'medium',
            importance: 'high',
            confidence: 50,
            estimatedMinutes: 45,
            previousScore: 55,
          },
          {
            name: 'Kinematics & Motion',
            difficulty: 'easy',
            importance: 'medium',
            confidence: 80,
            estimatedMinutes: 30,
            previousScore: 86,
            status: 'done',
          },
          {
            name: 'Optics',
            difficulty: 'medium',
            importance: 'medium',
            confidence: 46,
            estimatedMinutes: 40,
            previousScore: 51,
          },
          {
            name: 'Semiconductors',
            difficulty: 'easy',
            importance: 'low',
            confidence: 72,
            estimatedMinutes: 25,
            previousScore: 75,
            status: 'done',
          },
        ],
      },
      {
        name: 'Chemistry',
        color: '#22c55e',
        topics: [
          {
            name: 'Organic Reaction Mechanisms',
            difficulty: 'hard',
            importance: 'high',
            confidence: 35,
            estimatedMinutes: 60,
            previousScore: 41,
          },
          {
            name: 'Mole Concept & Stoichiometry',
            difficulty: 'medium',
            importance: 'high',
            confidence: 58,
            estimatedMinutes: 40,
            previousScore: 64,
          },
          {
            name: 'Chemical Bonding',
            difficulty: 'medium',
            importance: 'high',
            confidence: 66,
            estimatedMinutes: 45,
            previousScore: 71,
            status: 'done',
          },
          {
            name: 'Electrochemistry',
            difficulty: 'medium',
            importance: 'medium',
            confidence: 48,
            estimatedMinutes: 40,
            previousScore: 53,
          },
          {
            name: 'Periodic Table & Trends',
            difficulty: 'easy',
            importance: 'low',
            confidence: 85,
            estimatedMinutes: 20,
            previousScore: 90,
          },
        ],
      },
    ],
    // Quizzes replayed on the demo account so charts + readiness are real.
    _demoQuizzes: [
      { subject: 'Mathematics', topic: 'Probability', correct: 3, total: 8 },
      { subject: 'Chemistry', topic: 'Chemical Bonding', correct: 7, total: 8 },
      { subject: 'Physics', topic: 'Kinematics & Motion', correct: 7, total: 8 },
    ],
  }
}

/** "09:15"-style start a little in the future, rounded to 15 min. */
export function nextRoundHour() {
  const d = new Date(Date.now() + 10 * 60000)
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
