/**
 * Creates the demo account used in the hackathon story:
 *   demo@revision.app / demo1234
 *
 * Run with:  npm run seed
 */

import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { get, run } from './db/index.js'
import { buildDemoPayload } from './services/demoData.js'
import { createExamFromPayload } from './services/setupService.js'

const EMAIL = 'demo@revision.app'
const PASSWORD = 'demo1234'

function upsertDemoUser() {
  const existing = get('SELECT * FROM users WHERE email = ?', [EMAIL])
  if (existing) {
    run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(PASSWORD, 10), existing.id])
    run('DELETE FROM exams WHERE user_id = ?', [existing.id])
    return existing.id
  }
  const id = randomUUID()
  run('INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)', [
    id,
    'Aarav Sharma',
    EMAIL,
    bcrypt.hashSync(PASSWORD, 10),
  ])
  return id
}

export function seedDemo() {
  const userId = upsertDemoUser()
  const payload = buildDemoPayload()
  const { examId } = createExamFromPayload(userId, payload)
  return { userId, examId, email: EMAIL, password: PASSWORD }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const out = seedDemo()
  console.log(`✓ Demo account ready: ${out.email} / ${out.password}`)
  console.log(`  exam: ${out.examId}`)
}
