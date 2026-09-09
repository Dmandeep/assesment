import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collectionGroup, getDocs, updateDoc, doc } from 'firebase/firestore';

dotenv.config({ path: '.env.local' });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  await signInWithEmailAndPassword(auth, 'admin@crt.test', 'password123');
  
  const resultsSnapshot = await getDocs(collectionGroup(db, 'results'));
  
  let count = 0;
  for (const resultDoc of resultsSnapshot.docs) {
    const data = resultDoc.data();
    if (!data.startedAt) {
      // Use completedAt minus some time, or just a new timestamp
      await updateDoc(resultDoc.ref, {
        startedAt: data.completedAt || new Date()
      });
      count++;
    }
  }
  
  console.log(`Updated ${count} results with startedAt field!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to update:', err);
  process.exit(1);
});
