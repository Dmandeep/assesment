# CRT Assessment

A campus recruitment training (CRT) platform for timed multiple-choice assessments.
Built with Next.js 15, React 19, Tailwind and Firebase.

## What it does

**Administrators** create assessments, add questions by hand or by importing CSV/PDF,
publish them, grade attempts, and export results.

**Students** take timed assessments, see their score and a question-by-question
review once graded, and track their progress over time.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase project's values
npm run dev
```

The app runs at http://localhost:9002.

### Configuration

Firebase credentials are read from `NEXT_PUBLIC_FIREBASE_*` environment variables —
see `.env.example` for the full list and `docs/setup.md` for how to create a project.

> **Point `.env.local` at a development Firebase project, not production.**
> There is no fallback project: if `NEXT_PUBLIC_FIREBASE_API_KEY` or
> `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is missing, `src/firebase/config.ts` throws at
> startup rather than quietly reading someone else's data.

These `NEXT_PUBLIC_*` values are public by design: they ship in the client bundle and
identify the project. They authorize nothing on their own — all access control lives
in `firestore.rules`. Restrict the API key by HTTP referrer in the Google Cloud
Console so it cannot be used from other origins.

## Local testing with the emulators

Run the whole platform on your machine — no Firebase login, no cloud project, and no
service-account key. The emulators load `firestore.rules` from disk, so this is a real
test of the access rules rather than an open database that happens to be local.

Requires a Java runtime (the Firestore emulator is a Java process).

```bash
npm run emulators
```

Then, in a second terminal, seed an administrator, a student and one published
assessment, and start the app:

```bash
npm run seed:emulator && npm run dev
```

| Account | Email | Password |
| --- | --- | --- |
| Administrator | `admin@crt.test` | `password123` |
| Student | `student@crt.test` | `password123` |

The emulator UI is at http://localhost:4000; the app is at http://localhost:9002.

`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` is what points the app at the
emulators — unset it to go back to the real project. Emulator state is written to
`.emulator-data/` on exit and reloaded on the next start, and is gitignored.

The first administrator has to be seeded this way rather than through the UI:
`firestore.rules` gates creating `admin_roles/{uid}` on already being an administrator,
so there is no way to bootstrap the first one from inside the app.

### Optional AI assist

Setting `GOOGLE_GENAI_API_KEY` enables a Gemini-backed question-idea generator in the
admin dashboard. It is entirely optional — the platform works without it, and no
feature depends on an external AI provider.

## Deployment

Deployed on Vercel. Every `NEXT_PUBLIC_FIREBASE_*` variable must be set in the Vercel
project settings — the build fails without them, by design.

Firestore security rules and indexes live in `firestore.rules` and
`firestore.indexes.json`, wired up by `firebase.json`, and are deployed separately from
the app:

```bash
npx firebase-tools use && npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

`npx firebase-tools use` prints the target project first — check it before every deploy.
`.firebaserc` maps `default` to `elitestudytracker`.

The index file is not optional. Firestore creates single-field indexes automatically for
collections but **not** for collection-group scope, and the admin Attempts tab, the
leaderboard and the display-name propagation all query the `results` collection group.
Without these indexes they fail at runtime with `FAILED_PRECONDITION`.

## Known limitations

These are real and worth knowing before relying on the platform for high-stakes
assessment. They are tracked for a dedicated security milestone:

- **Scoring is not server-authoritative.** There is no backend API; the browser talks
  to Firestore directly, and `firestore.rules` permits a student to write their own
  result document. A determined student can alter their score.
- **The timer is client-side.** It is a `setInterval` in the browser with no
  server-recorded expiry, so a refresh restarts it and creates a second attempt.
- **Attempt records are readable across students.** The collection-group rule for
  `results` allows any signed-in user to list them.
- **Tab-switch detection is not proctoring.** A `visibilitychange` listener flags the
  attempt for the instructor to review. It is trivially bypassed and should not be
  described as proctoring or lockdown.

No load testing has been performed, so throughput and concurrency limits are unknown.
