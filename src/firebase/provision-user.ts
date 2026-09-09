'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { connectEmulatorsFor } from '@/firebase/emulators';

const SECONDARY_APP_NAME = 'user-provisioning';

/**
 * Creates a Firebase Auth account without disturbing the caller's own session.
 *
 * createUserWithEmailAndPassword signs the new account in on whichever Auth
 * instance it is handed. On the primary instance that silently replaces the
 * administrator's session with the account they just created — and because the
 * admin dashboard gates on admin_roles/{uid}, the admin is locked out of the
 * page mid-task. Doing the work on a throwaway secondary FirebaseApp keeps that
 * side effect contained.
 *
 * Returns the new account's uid. Writing users/{uid} and admin_roles/{uid} is
 * left to the caller, who is still signed in as the administrator on the
 * primary app and therefore still passes isAdmin() in firestore.rules.
 */
export async function createAuthAccount(email: string, password: string): Promise<string> {
  let secondaryApp: FirebaseApp;
  try {
    secondaryApp = getApp(SECONDARY_APP_NAME);
  } catch {
    secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  }

  const secondaryAuth = getAuth(secondaryApp);
  // The secondary app is a fresh FirebaseApp, so it needs its own emulator wiring.
  connectEmulatorsFor(secondaryApp, secondaryAuth);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    // Tear down even when creation failed, so a retry starts clean.
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
