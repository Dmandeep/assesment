import { FieldValue } from 'firebase-admin/firestore'
import { initAdmin, requireConfirmation } from './lib'

async function main() {
  const { db, projectId } = initAdmin()

  requireConfirmation(`Push 5 sample assessments to production`, projectId, { confirm: true })

  const batch = db.batch()
  const examSubjects = ['Mathematics', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation', 'Programming']

  for (let i = 0; i < 5; i++) {
    const examId = `sample-exam-0${i + 1}`
    const subject = examSubjects[i]
    
    batch.set(db.doc(`exams/${examId}`), {
      id: examId,
      title: `CRT ${subject} Mock Test`,
      description: `A standard assessment for ${subject} covering core concepts.`,
      subject: subject,
      timeLimitMinutes: 30,
      passingScore: 60,
      status: 'published',
      isPractice: false,
      createdBy: 'system-seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Add 2 sample questions to each exam
    for (let q = 1; q <= 2; q++) {
      const qId = `q-${examId}-0${q}`
      batch.set(db.doc(`exams/${examId}/questions/${qId}`), {
        id: qId, 
        examId, 
        questionText: `Sample question ${q} for ${subject}?`, 
        options: ['Option A', 'Option B', 'Option C', 'Option D']
      })
      batch.set(db.doc(`exams/${examId}/answers/${qId}`), {
        id: qId, 
        correctOptionIndex: 0
      })
    }
  }

  await batch.commit()
  console.log(`\n  Successfully pushed 5 assessments to ${projectId}!\n`)
}

main().catch(err => {
  console.error(`\n  Push failed: ${err.message}\n`)
  process.exit(1)
})
