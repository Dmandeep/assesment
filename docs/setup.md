# Setup

How to run CRT Assessment against your own Firebase project, so development never
touches production.

## 0. Prerequisites

Neither is currently installed on this machine:

- **Node.js 20 or 22 LTS** — https://nodejs.org (brings `npm` and `npx`)
- **Git** — https://git-scm.com/download/win

Confirm with `node --version` and `git --version` in a **new** terminal after
installing — the installer adds them to `PATH`, but existing terminals won't see it.

## 1. Create a Firebase project

1. https://console.firebase.google.com → **Add project**. Google Analytics is not
   needed.
2. Build → **Authentication** → Get started → **Email/Password** → enable the first
   toggle (not "Email link") → Save.
   Without this, sign-in fails for everyone.
3. Build → **Firestore Database** → Create database → **Production mode** → choose a
   region. **The region is permanent.**

   Production mode denies all access until rules are deployed in step 3 — that is
   intentional. Test mode would leave the database open to the world for 30 days, and
   the project ID is public in the client bundle.

## 2. Register a web app and configure

⚙️ **Project settings** → General → Your apps → **`</>`** → register (skip Hosting).

Copy the values from **SDK setup and configuration → Config** into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Also update `.firebaserc` so CLI deploys target the right project.

## 3. Deploy the security rules and indexes

```bash
npx firebase-tools login
npx firebase-tools use --add          # select your project
npx firebase-tools use                # ← confirm before deploying
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

`firebase.json` points the CLI at `firestore.rules` and `firestore.indexes.json`.

Deploy the indexes too, not just the rules. Firestore creates single-field indexes
automatically for collections but **not** for collection-group scope, and three of the
app's queries span the `results` collection group — the admin Attempts tab, the student
leaderboard, and display-name propagation. Without those indexes each fails at runtime
with `FAILED_PRECONDITION`. Builds are asynchronous; the Console shows "Building" for a
few minutes.

## 4. Create an administrator

Two documents are required for admin access, and creating only one is the usual
mistake:

| Document | Purpose |
| --- | --- |
| `users/{uid}` with `role: 'admin'` | drives post-login redirect |
| `admin_roles/{uid}` | **the one that actually grants access** |

`firestore.rules` gates every admin permission on `admin_roles/{uid}` existing. A user
with `role: 'admin'` but no `admin_roles` document reaches the admin page and sees
nothing at all.

### By hand (no extra tooling)

1. Sign up through the app's normal sign-up form to create the Auth user.
2. Firebase Console → Authentication → **Users** → copy that user's **UID**.
3. Firestore → **Start collection** → collection ID `admin_roles` → document ID = that
   UID → add field `uid` (string) = the same UID → Save.
4. In `users/{uid}`, set `role` to `admin`.
5. Sign out and back in.

### Service account (only for scripted setup or data cloning)

⚙️ Project settings → **Service accounts** → Generate new private key. Save it
**outside this repository**, e.g. `D:\secrets\cm-dev-sa.json`, and point
`FIREBASE_SERVICE_ACCOUNT_JSON` at that path.

> **This file is a real secret**, unlike the `NEXT_PUBLIC_*` values above. It bypasses
> `firestore.rules` entirely: it can read and write every document, mint tokens to
> impersonate any user, and delete the database. Never commit it, never paste it into
> a chat or issue, and never prefix it with `NEXT_PUBLIC_`.
>
> If one is ever exposed: Google Cloud Console → IAM & Admin → Service Accounts →
> select the account → **Keys** → delete the exposed key → create a new one.
> Deleting a key is instant and safe.

## 5. Verify you are NOT on production

Run `npm run dev`, open devtools → **Network**, and confirm the Firestore requests
carry your project ID — **not** `studio-4002768436-3fadb`. If `.env.local` is not being
read the app will not start at all: `src/firebase/config.ts` throws rather than falling
back to another project. Next.js reads env files only at startup, so restart the dev
server after editing `.env.local`.

Do this before any other testing.
