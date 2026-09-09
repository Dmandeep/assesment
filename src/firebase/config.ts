/**
 * Firebase web configuration.
 *
 * These values are public by design — they ship in the client bundle and only
 * identify the project. Access control lives entirely in firestore.rules.
 *
 * They are read from NEXT_PUBLIC_FIREBASE_* so that each environment points at
 * its own project. Next.js inlines these at build time, so each one must be
 * written as a full literal `process.env.NEXT_PUBLIC_...` expression — a
 * dynamic lookup like process.env[key] will not be replaced.
 *
 * There is deliberately no fallback project. An unconfigured build fails loudly
 * here rather than silently reading and writing someone else's data.
 */

const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

// apiKey and projectId are the two the SDK cannot start without.
if (!envConfig.apiKey || !envConfig.projectId) {
  throw new Error(
    'Firebase is not configured. NEXT_PUBLIC_FIREBASE_API_KEY and ' +
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID must both be set. Copy .env.example to ' +
      '.env.local and fill it in (see docs/setup.md), then restart the dev ' +
      'server — Next.js only reads env files at startup.'
  );
}

export const firebaseConfig = envConfig as {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

/** The project this build will actually talk to. Handy for debugging. */
export const activeProjectId = firebaseConfig.projectId;
