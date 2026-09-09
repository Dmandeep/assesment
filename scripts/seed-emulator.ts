/**
 * Seeds the local Firebase Emulator Suite with enough data to exercise the
 * whole flow: an administrator, a student, and one published assessment.
 *
 *   npm run seed:emulator
 *
 * This talks to the emulators ONLY. It refuses to run unless both emulator
 * host variables are set, so it cannot reach a real project even by accident —
 * the Admin SDK bypasses firestore.rules, so that guard matters.
 *
 * The first administrator has to be created out-of-band like this: firestore.rules
 * gates creating admin_roles/{uid} on already being an admin, so there is no way
 * to bootstrap the first one through the UI.
 */

import { readFileSync } from 'node:fs'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Papa from 'papaparse'

const AUTH_HOST = '127.0.0.1:9099'
const FIRESTORE_HOST = '127.0.0.1:8080'
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'elitestudytracker'

const ADMIN = { email: 'admin@crt.test', password: 'password123', username: 'Test Administrator' }
const STUDENT = { email: 'student@crt.test', password: 'password123', username: 'Test Student' }

// Point the Admin SDK at the emulators before it initialises.
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= AUTH_HOST
process.env.FIRESTORE_EMULATOR_HOST ||= FIRESTORE_HOST

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Refusing to run: emulator hosts are not set. This script is emulator-only.')
  process.exit(1)
}

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID })
const auth = getAuth(app)
const db = getFirestore(app)

async function upsertUser(spec: typeof ADMIN, role: 'admin' | 'student') {
  let uid: string
  try {
    uid = (await auth.getUserByEmail(spec.email)).uid
  } catch {
    uid = (await auth.createUser({
      email: spec.email,
      password: spec.password,
      displayName: spec.username,
    })).uid
  }

  await db.doc(`users/${uid}`).set(
    { id: uid, email: spec.email, username: spec.username, role, createdAt: FieldValue.serverTimestamp() },
    { merge: true }
  )

  if (role === 'admin') {
    // This document — not users/{uid}.role — is what firestore.rules checks.
    await db.doc(`admin_roles/${uid}`).set({ uid, createdAt: FieldValue.serverTimestamp() }, { merge: true })
  }

  console.log(`  ${role.padEnd(7)} ${spec.email.padEnd(20)} uid=${uid}`)
  return uid
}

async function seedExam(createdBy: string) {
  const csv = readFileSync('docs/sample-questions.csv', 'utf8')
  const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data

  const examId = 'seed-quant-mock-01'
  await db.doc(`exams/${examId}`).set({
    id: examId,
    title: 'CRT Aptitude Mock #01',
    description: 'Seeded assessment for local testing.',
    subject: 'Arithmetic',
    timeLimitMinutes: 15,
    passingScore: 60,
    status: 'published',
    isPractice: false,
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const batch = db.batch()
  rows.forEach((row, i) => {
    const qId = `q-seed-${String(i + 1).padStart(2, '0')}`
    const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean)
    const correct = Number(row.correctIndex)
    if (!row.questionText || options.length < 2 || Number.isNaN(correct)) return

    // Questions are student-readable; the key lives in a separate, admin-only
    // subcollection. Keeping that split is the point of the schema.
    batch.set(db.doc(`exams/${examId}/questions/${qId}`), {
      id: qId, examId, questionText: row.questionText, options,
    })
    batch.set(db.doc(`exams/${examId}/answers/${qId}`), {
      id: qId, correctOptionIndex: correct,
    })
  })
  await batch.commit()

  console.log(`  exam    ${examId} — ${rows.length} questions, published`)
  return examId
}

async function main() {
  console.log(`\n  Seeding emulators for project "${PROJECT_ID}"\n`)
  const adminUid = await upsertUser(ADMIN, 'admin')
  await upsertUser(STUDENT, 'student')
  await seedExam(adminUid)
  console.log(`\n  Done. Sign in at http://localhost:9002 with either account.`)
  console.log(`  Password for both: ${ADMIN.password}\n`)
}

main().catch(err => {
  console.error(`\n  Seed failed: ${err.message}`)
  console.error('  Are the emulators running? Start them with: npm run emulators\n')
  process.exit(1)
})
