/**
 * Imports a JSON export produced by export-firestore.ts into a target project.
 *
 *   $env:FIREBASE_SERVICE_ACCOUNT_JSON="D:\secrets\cm-dev-sa.json"
 *   npx tsx scripts/import-firestore.ts --file backup/firestore-....json --confirm
 *
 * Safety: refuses to run when the target project equals the source project the
 * export came from, so a backup can never be written back over its origin.
 * Pass --allow-same-project only if you genuinely mean to restore in place.
 */

import { readFileSync, existsSync } from 'node:fs'
import { initAdmin, parseArgs, requireConfirmation } from './lib'

const BATCH_LIMIT = 400 // Firestore caps a batch at 500 writes.

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const file = typeof args.file === 'string' ? args.file : ''

  if (!file) throw new Error('Pass --file <path to the JSON export>')
  if (!existsSync(file)) throw new Error(`No such file: ${file}`)

  const payload = JSON.parse(readFileSync(file, 'utf8'))
  const records: { path: string; data: Record<string, any> }[] = payload.records ?? []
  if (records.length === 0) throw new Error(`"${file}" contains no records.`)

  const { db, projectId } = initAdmin()

  if (payload.sourceProjectId === projectId && !args['allow-same-project']) {
    throw new Error(
      `This export came from "${payload.sourceProjectId}" and the target is the same project.\n` +
        `  Refusing, so a backup cannot overwrite its own source.\n` +
        `  Pass --allow-same-project if an in-place restore is genuinely intended.`
    )
  }

  requireConfirmation(
    `Import ${records.length} document(s) from ${payload.sourceProjectId ?? 'unknown'}`,
    projectId,
    args
  )

  let written = 0
  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const chunk = records.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()
    for (const record of chunk) {
      batch.set(db.doc(record.path), record.data, { merge: true })
    }
    await batch.commit()
    written += chunk.length
    console.log(`  ${written}/${records.length} written`)
  }

  console.log(`\n  Imported ${written} document(s) into ${projectId}\n`)
}

main().catch(err => {
  console.error(`\n  Import failed: ${err.message}\n`)
  process.exit(1)
})
