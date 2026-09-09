/**
 * Creates (or promotes) an administrator on a Firebase project.
 *
 *   $env:FIREBASE_SERVICE_ACCOUNT_JSON="D:\secrets\cm-dev-sa.json"
 *   npx tsx scripts/create-admin.ts --email you@example.com --confirm
 *
 * The password is prompted for and never echoed, so it stays out of your shell
 * history and terminal scrollback. It is never written to disk or logged.
 *
 * Admin access needs BOTH documents below. Creating only the first is the usual
 * mistake — it changes the post-login redirect but grants nothing, so the admin
 * dashboard loads completely empty:
 *
 *   users/{uid}       role: 'admin'   -> drives the redirect after sign-in
 *   admin_roles/{uid}                 -> what firestore.rules actually checks
 */

import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { initAdmin, parseArgs, promptHidden, requireConfirmation } from './lib'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email = typeof args.email === 'string' ? args.email.trim() : ''
  const name = typeof args.name === 'string' ? args.name : email.split('@')[0]

  if (!email) throw new Error('Pass --email <address>')

  const { app, db, projectId } = initAdmin()
  const auth = getAuth(app)

  requireConfirmation(`Create or promote an administrator: ${email}`, projectId, args)

  // Reuse the account if it already exists, so this doubles as "promote".
  let uid: string
  let created = false
  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    console.log(`  Existing account found — promoting it to administrator.`)
  } catch (err: any) {
    if (err.code !== 'auth/user-not-found') throw err

    const password = await promptHidden('  Choose a password (min 6 characters): ')
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')
    const again = await promptHidden('  Re-enter the password: ')
    if (password !== again) throw new Error('The passwords did not match.')

    const user = await auth.createUser({ email, password, displayName: name })
    uid = user.uid
    created = true
    console.log(`  Auth account created.`)
  }

  await db.doc(`users/${uid}`).set(
    {
      id: uid,
      email,
      username: name,
      role: 'admin',
      ...(created ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  )
  console.log(`  users/${uid} written (role: admin).`)

  await db.doc(`admin_roles/${uid}`).set(
    { uid, createdAt: FieldValue.serverTimestamp() },
    { merge: true }
  )
  console.log(`  admin_roles/${uid} written — this is what grants access.`)

  console.log(`\n  Done. Sign in at /  with ${email}\n`)
}

main().catch(err => {
  console.error(`\n  Failed: ${err.message}\n`)
  process.exit(1)
})
