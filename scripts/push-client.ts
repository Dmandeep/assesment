import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';

// Load .env.local
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log('Logging in as admin...');
  const userCredential = await signInWithEmailAndPassword(auth, 'admin@crt.test', 'password123');
  const adminUid = userCredential.user.uid;
  console.log(`Logged in successfully! Admin UID: ${adminUid}`);

  const csv = readFileSync('C:\\Users\\bhuvana\\Downloads\\CRT_Aptitude_Mock_#01_questions.csv', 'utf8');
  const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data as any[];

  for (let i = 1; i <= 5; i++) {
    const examId = `aptitude-mock-0${i}`;
    console.log(`Creating exam: ${examId}...`);
    
    // Exam metadata
    await setDoc(doc(db, 'exams', examId), {
      id: examId,
      title: `CRT Aptitude Mock #0${i}`,
      description: `Practice assessment ${i} covering core quantitative and verbal concepts.`,
      subject: 'Aptitude',
      timeLimitMinutes: 15,
      passingScore: 60,
      status: 'published',
      isPractice: false,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    
    rows.forEach((row, index) => {
      const qId = `q-${examId}-${String(index + 1).padStart(2, '0')}`;
      const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean);
      const correct = Number(row.correctIndex);
      
      if (!row.questionText || options.length < 2 || Number.isNaN(correct)) return;

      // Question
      batch.set(doc(db, `exams/${examId}/questions/${qId}`), {
        id: qId, 
        examId, 
        questionText: row.questionText, 
        options,
      });
      
      // Answer
      batch.set(doc(db, `exams/${examId}/answers/${qId}`), {
        id: qId, 
        correctOptionIndex: correct,
      });
    });

    await batch.commit();
    console.log(`Created exam ${examId} with ${rows.length} questions.`);
  }

  console.log('All 5 assessments pushed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to push assessments:', err);
  process.exit(1);
});
