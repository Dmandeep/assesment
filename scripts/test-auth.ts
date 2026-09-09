import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
dotenv.config({ path: '.env.local' });
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
async function test() {
  try {
    const user = await createUserWithEmailAndPassword(auth, 'admin@crt.test', 'password123');
    console.log('Created user:', user.user.uid);
  } catch (e: any) {
    console.log('Create error:', e.code);
    if (e.code === 'auth/email-already-in-use') {
      try {
        const user = await signInWithEmailAndPassword(auth, 'admin@crt.test', 'password123');
        console.log('Signed in:', user.user.uid);
      } catch(err: any) {
        console.log('Sign in error:', err.code);
      }
    }
  }
  process.exit(0);
}
test();
