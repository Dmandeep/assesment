/**
 * Exports Firestore data to timestamped JSON under backup/.
 *
 * READ-ONLY against the source project — it never writes.
 *
 *   $env:FIREBASE_SERVICE_ACCOUNT_JSON="D:\secrets\prod-sa.json"
 *   npx tsx scripts/export-firestore.ts --confirm
 *
 * Handles the app's nested shape:
 *   users/{uid}/results/{resultId}
 *   exams/{examId}/questions/{qId}
 *   exams/{examId}/answers/{qId}
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { initAdmin, parseArgs, requireConfirmation } from './lib'

interface DocRecord {
  path: string
  data: Record<string, any>
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { db, projectId } = initAdmin()

  requireConfirmation('Export Firestore data (read-only)', projectId, args)

  const records: DocRecord[] = []

  const dumpCollection = async (collectionPath: string) => {
    const snap = await db.collection(collectionPath).get()
    for (const doc of snap.docs) {
      records.push({ path: doc.ref.path, data: doc.data() })
      // Recurse into whatever subcollections this document actually has,
      // rather than assuming a fixed set.
      const subs = await doc.ref.listCollections()
      for (const sub of subs) {
        await dumpCollection(sub.path)
      }
    }
    console.log(`  ${collectionPath.padEnd(40)} ${snap.size} document(s)`)
  }

  console.log('  Reading collections:')
  for (const name of ['users', 'admin_roles', 'exams']) {
    await dumpCollection(name)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(process.cwd(), 'backup')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `firestore-${projectId}-${stamp}.json`)

  writeFileSync(
    file,
    JSON.stringify({ sourceProjectId: projectId, exportedAt: new Date().toISOString(), records }, null, 2),
    'utf8'
  )

  console.log(`\n  Exported ${records.length} document(s)`)
  console.log(`  -> ${file}\n`)
}

main().catch(err => {
  console.error(`\n  Export failed: ${err.message}\n`)
  process.exit(1)
})
