/**
 * Shared helpers for the maintenance scripts.
 *
 * These run under Node with the Firebase Admin SDK, which BYPASSES
 * firestore.rules entirely. Treat the service-account file as a real secret and
 * keep it outside the repository.
 */

import { readFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { cert, initializeApp, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/** Collections copied by the export/import pair, in dependency order. */
export const ROOT_COLLECTIONS = ['users', 'admin_roles', 'exams'] as const

export interface ServiceAccountInfo {
  app: App
  db: Firestore
  projectId: string
}

/**
 * Loads a service account from a FILE PATH given by env var (default
 * FIREBASE_SERVICE_ACCOUNT_JSON). The path is read here and never logged.
 */
export function initAdmin(envVar = 'FIREBASE_SERVICE_ACCOUNT_JSON', appName = 'default'): ServiceAccountInfo {
  const path = process.env[envVar]
  if (!path) {
    throw new Error(
      `${envVar} is not set. It must be a PATH to a service-account JSON file ` +
        `kept outside this repository, e.g. D:\\secrets\\cm-dev-sa.json`
    )
  }
  if (!existsSync(path)) {
    throw new Error(`${envVar} points at "${path}", which does not exist.`)
  }

  let parsed: any
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e: any) {
    throw new Error(`Could not parse the service account at "${path}": ${e.message}`)
  }
  if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
    throw new Error(`"${path}" is not a valid service-account key file.`)
  }

  const existing = getApps().find(a => a.name === appName)
  const app = existing ?? initializeApp({ credential: cert(parsed) }, appName)

  return { app, db: getFirestore(app), projectId: parsed.project_id }
}

/** Reads a line from stdin. */
export function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer) }))
}

/**
 * Reads a line from stdin without echoing it, so passwords stay out of the
 * terminal scrollback. Falls back to a visible prompt where the TTY does not
 * support raw mode.
 */
export function promptHidden(question: string): Promise<string> {
  const input: any = process.stdin
  if (!input.isTTY) return prompt(question)

  return new Promise(resolve => {
    process.stdout.write(question)
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    let value = ''
    const onData = (char: string) => {
      for (const c of char) {
        if (c === '\r' || c === '\n') {
          input.setRawMode(false)
          input.pause()
          input.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(value)
          return
        }
        if (c === '\u0003') { // Ctrl+C
          input.setRawMode(false)
          process.stdout.write('\n')
          process.exit(130)
        }
        if (c === '\u007f' || c === '\b') { // backspace
          value = value.slice(0, -1)
        } else {
          value += c
        }
      }
    }
    input.on('data', onData)
  })
}

/** Parses `--key value` and `--flag` style arguments. */
export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) { out[key] = next; i++ }
    else out[key] = true
  }
  return out
}

/** Refuses to continue unless --confirm was passed, after showing the target. */
export function requireConfirmation(action: string, projectId: string, args: Record<string, string | boolean>) {
  console.log(`\n  ${action}`)
  console.log(`  Target project: ${projectId}\n`)
  if (!args.confirm) {
    console.error('  Refusing to proceed without --confirm.')
    console.error('  Re-run the command with --confirm once the project above is correct.\n')
    process.exit(1)
  }
}
