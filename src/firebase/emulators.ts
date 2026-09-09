'use client';

import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

/**
 * Local Firebase Emulator Suite wiring.
 *
 * Opt in with NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.local. When it is
 * anything else the app talks to the real project exactly as before, so this
 * cannot affect a deployed build unless the variable is deliberately set there.
 *
 * Ports match the "emulators" block in firebase.json. The emulators enforce
 * firestore.rules from disk, so this is a real test of the rules — not an open
 * database that happens to be local.
 */

export const usingEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

const EMULATOR_HOST = '127.0.0.1';
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;

// Firebase throws if an SDK instance is pointed at an emulator twice, and
// Fast Refresh re-runs module code freely. Track per FirebaseApp rather than
// with a module-level boolean so a secondary app still gets connected.
const connected = new WeakSet<FirebaseApp>();

export function connectEmulatorsFor(app: FirebaseApp, auth?: Auth, firestore?: Firestore) {
  if (!usingEmulators || connected.has(app)) return;
  connected.add(app);

  try {
    if (auth) {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
    }
    if (firestore) {
      connectFirestoreEmulator(firestore, EMULATOR_HOST, FIRESTORE_PORT);
    }
    if (typeof window !== 'undefined') {
      console.info(
        `[firebase] Local emulators in use — Auth :${AUTH_PORT}, Firestore :${FIRESTORE_PORT}. ` +
          'No cloud project is being read or written.'
      );
    }
  } catch (e) {
    console.warn('[firebase] Could not attach to the emulators. Are they running?', e);
  }
}
