import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, writeBatch } from 'firebase/firestore';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log('Logging in as admin to fetch exam keys...');
  await signInWithEmailAndPassword(auth, 'admin@crt.test', 'password123');
  
  const exams = ['aptitude-mock-01', 'aptitude-mock-02', 'aptitude-mock-03', 'aptitude-mock-04', 'aptitude-mock-05'];
  const examData: Record<string, any> = {};

  for (const examId of exams) {
    const questionsSnapshot = await getDocs(collection(db, `exams/${examId}/questions`));
    const answersSnapshot = await getDocs(collection(db, `exams/${examId}/answers`));
    
    const questions: string[] = [];
    questionsSnapshot.forEach(doc => questions.push(doc.id));
    
    const answers: Record<string, number> = {};
    answersSnapshot.forEach(doc => answers[doc.id] = doc.data().correctOptionIndex);
    
    examData[examId] = { questions, answers };
  }
  console.log('Fetched keys for 5 exams.');

  // Create 10 students
  for (let i = 1; i <= 10; i++) {
    const studentEmail = `student${i}@crt.test`;
    let uid = '';
    
    try {
      const userCred = await createUserWithEmailAndPassword(auth, studentEmail, 'password123');
      uid = userCred.user.uid;
      console.log(`Created ${studentEmail}`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        const userCred = await signInWithEmailAndPassword(auth, studentEmail, 'password123');
        uid = userCred.user.uid;
        console.log(`Signed into ${studentEmail}`);
      } else {
        throw e;
      }
    }

    // Write user profile
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      email: studentEmail,
      username: `Test Student ${i}`,
      role: 'student',
      createdAt: serverTimestamp()
    }, { merge: true });

    // Take 2 random exams for each student
    for (let j = 0; j < 2; j++) {
      const examId = exams[Math.floor(Math.random() * exams.length)];
      const examInfo = examData[examId];
      
      const responses: Record<string, number> = {};
      let correctCount = 0;
      
      examInfo.questions.forEach((qId: string) => {
        // 75% chance of correct answer, 25% random wrong
        const correctOpt = examInfo.answers[qId];
        let chosenOpt = correctOpt;
        if (Math.random() > 0.75) {
          chosenOpt = Math.floor(Math.random() * 4); // 0 to 3
        }
        responses[qId] = chosenOpt;
        if (chosenOpt === correctOpt) correctCount++;
      });
      
      const totalQuestions = examInfo.questions.length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      
      // 20% chance of being flagged
      const isFlagged = Math.random() < 0.2;
      const resultId = `res-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      
      await setDoc(doc(db, `users/${uid}/results/${resultId}`), {
        completedAt: serverTimestamp(),
        integrityStatus: isFlagged ? 'Flagged' : 'Clean',
        responses: responses,
        totalQuestions: totalQuestions,
        studentId: uid,
        studentEmail: studentEmail,
        studentUsername: `Test Student ${i}`,
        examId: examId,
        examTitle: `CRT Aptitude Mock #0${examId.split('-').pop()}`,
        score: score,
        correctCount: correctCount,
        correctAnswers: examInfo.answers
      });
      
      console.log(`  -> Finished ${examId} | Score: ${score}% | Status: ${isFlagged ? 'Flagged' : 'Clean'}`);
    }
  }

  console.log('Successfully simulated 10 students and their results!');
  process.exit(0);
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
