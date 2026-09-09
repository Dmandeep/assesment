
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Plus, 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  Save, 
  LogOut, 
  ShieldCheck,
  History,
  Menu,
  ChevronRight,
  UserCog,
  UserPlus,
  X,
  Edit2,
  Loader2,
  Shield,
  Calculator,
  Search,
  Filter,
  Send,
  Download,
  Upload,
  FileSearch,
  ClipboardList,
  RotateCcw,
  Info,
  BarChart3,
  Trophy,
  Medal,
  RefreshCcw,
  Clock,
  Calendar as CalendarIcon,
  FileJson,
  GraduationCap,
  Sparkles
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, getDoc, serverTimestamp, query, collectionGroup, getDocs, updateDoc, writeBatch, where, orderBy, limit, getCountFromServer } from "firebase/firestore"
import { generateQuestionIdeas, type GenerateQuestionIdeasOutput } from "@/ai/flows/admin-question-idea-generator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { createAuthAccount } from "@/firebase/provision-user"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { format, isSameDay, getHours } from "date-fns"
import Papa from "papaparse"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const getSafeDate = (dateVal: any) => {
  if (!dateVal) return null;
  if (dateVal.toDate) return dateVal.toDate();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

const SUBJECTS = ["English", "Computers", "Arithmetic", "Reasoning", "Others"];

export default function AdminDashboard() {
  const containerRef = useScrollReveal()
  const db = useFirestore()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const csvInputRef = useRef<HTMLInputElement>(null)
  const attachDocInputRef = useRef<HTMLInputElement>(null)
  
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAttachingDoc, setIsAttachingDoc] = useState(false)
  const [aiIdeas, setAiIdeas] = useState<GenerateQuestionIdeasOutput | null>(null)
  const [performanceInsights, setPerformanceInsights] = useState<any>(null)
  const [isAnalyzingPerformance, setIsAnalyzingPerformance] = useState(false)
  const [topic, setTopic] = useState("")
  const [examToDelete, setExamToDelete] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [logsToDelete, setLogsToDelete] = useState<any[] | null>(null)
  
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [newStudent, setNewStudent] = useState({ email: "", password: "", username: "", role: "student" as "student" | "admin" })
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [isGrading, setIsGrading] = useState<string | null>(null)
  const [isGradingAll, setIsGradingAll] = useState(false)

  const [selectedLogs, setSelectedLogs] = useState<string[]>([])

  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [isLoadingExam, setIsLoadingExam] = useState(false)
  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    subject: "Others",
    timeLimitMinutes: 30,
    passingScore: 70,
    status: "draft" as "draft" | "published",
    isPractice: false
  })
  const [examQuestions, setExamQuestions] = useState<any[]>([])

  const [userSearch, setUserSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const [auditSearch, setAuditSearch] = useState("")
  const [auditExamFilter, setAuditExamFilter] = useState<string>("all")
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)
  const [timeFilter, setTimeFilter] = useState<string>("all")

  const [vaultSubject, setVaultSubject] = useState<string>("All")

  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false)
  const [csvPasteValue, setCsvPasteValue] = useState("")

  const [stats, setStats] = useState({ exams: 0, users: 0, attempts: 0, alerts: 0 })

  useEffect(() => {
    setMounted(true)
    const savedExam = localStorage.getItem('admin_exam_draft')
    const savedQuestions = localStorage.getItem('admin_questions_draft')
    if (savedExam) setNewExam(JSON.parse(savedExam))
    if (savedQuestions) setExamQuestions(JSON.parse(savedQuestions))
  }, [])

  useEffect(() => {
    if (mounted && !editingExamId) {
      localStorage.setItem('admin_exam_draft', JSON.stringify(newExam))
      localStorage.setItem('admin_questions_draft', JSON.stringify(examQuestions))
    }
  }, [newExam, examQuestions, mounted, editingExamId])

  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "admin_roles", user.uid)
  }, [db, user])
  const { data: adminRole, isLoading: adminRoleLoading } = useDoc(adminRoleRef)

  const isStrictlyAdmin = !!(user && !adminRoleLoading && adminRole && adminRole.id === user.uid);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [user, isUserLoading, router])

  const examsQuery = useMemoFirebase(() => {
    if (!isStrictlyAdmin) return null
    return collection(db, "exams")
  }, [db, isStrictlyAdmin])
  const { data: exams, isLoading: examsLoading } = useCollection(examsQuery)

  const resultsQuery = useMemoFirebase(() => {
    if (!isStrictlyAdmin) return null
    return query(collectionGroup(db, "results"), orderBy("startedAt", "desc"))
  }, [db, isStrictlyAdmin])
  const { data: results, isLoading: resultsLoading } = useCollection(resultsQuery)

  const usersQuery = useMemoFirebase(() => {
    if (!isStrictlyAdmin) return null
    return collection(db, "users")
  }, [db, isStrictlyAdmin])
  const { data: allUsers, isLoading: usersLoading } = useCollection(usersQuery)

  useEffect(() => {
    if (!exams || !allUsers || !results) return;
    setStats({
      exams: exams.length,
      users: allUsers.length,
      attempts: results.length,
      alerts: results.filter(r => r.integrityStatus === 'Flagged').length
    });
  }, [exams, allUsers, results]);

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
  }

  const getStudentLiveName = (studentId: string, fallbackName: string) => {
    const liveUser = allUsers?.find(u => u.id === studentId);
    return liveUser?.username || fallbackName || "Student";
  };

  const handleEditExam = async (examId: string) => {
    setIsLoadingExam(true)
    try {
      const examToEdit = exams?.find(e => e.id === examId)
      if (!examToEdit) throw new Error("Exam not found")

      setNewExam({
        title: examToEdit.title || "",
        description: examToEdit.description || "",
        subject: examToEdit.subject || "Others",
        timeLimitMinutes: examToEdit.timeLimitMinutes || 30,
        passingScore: examToEdit.passingScore || 70,
        status: examToEdit.status || "draft",
        isPractice: !!examToEdit.isPractice
      })

      const publicQuestionsRef = collection(db, `exams/${examId}/questions`)
      const privateAnswersRef = collection(db, `exams/${examId}/answers`)
      
      const [questionsSnap, answersSnap] = await Promise.all([
        getDocs(publicQuestionsRef),
        getDocs(privateAnswersRef)
      ])

      const answersMap: Record<string, number> = {}
      answersSnap.forEach(doc => {
        answersMap[doc.id] = doc.data().correctOptionIndex
      })

      const questions = questionsSnap.docs.map(doc => ({
        id: doc.id,
        questionText: doc.data().questionText || "",
        options: doc.data().options || ["", "", "", ""],
        correctOptionIndex: answersMap[doc.id] || 0
      }))

      setExamQuestions(questions)
      setEditingExamId(examId)
      setActiveTab("authoring")
    } catch (e: any) {
      toast({ title: "Edit Error", description: e.message, variant: "destructive" })
    } finally {
      setIsLoadingExam(false)
    }
  }

  const handleGradeResult = async (res: any) => {
    if (!isStrictlyAdmin) return;
    setIsGrading(res.id);
    try {
      const answersRef = collection(db, `exams/${res.examId}/answers`);
      const answersSnap = await getDocs(answersRef);
      const answerKey: Record<string, number> = {};
      answersSnap.forEach(doc => {
        answerKey[doc.id] = doc.data().correctOptionIndex;
      });

      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      const totalQuestionsCount = Object.keys(answerKey).length;
      
      Object.keys(answerKey).forEach(qId => {
        const studentChoice = res.responses?.[qId];
        if (studentChoice === undefined) {
          unanswered++;
        } else if (answerKey[qId] === studentChoice) {
          correct++;
        } else {
          incorrect++;
        }
      });

      const score = totalQuestionsCount > 0 ? Math.round((correct / totalQuestionsCount) * 100) : 0;

      const resultRef = res.__path ? doc(db, res.__path) : doc(db, "users", res.studentId, "results", res.id);
      await updateDoc(resultRef, {
        score,
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: unanswered,
        totalQuestions: totalQuestionsCount,
        correctAnswers: answerKey, 
        gradedAt: serverTimestamp()
      });

      toast({ 
        title: res.correctAnswers ? "Regraded Successfully" : "Grading Finalized", 
        description: `Computed score: ${score}% (${correct}/${totalQuestionsCount} correct)` 
      });
    } catch (e: any) {
      toast({ title: "Grading Error", description: e.message, variant: "destructive" });
    } finally {
      setIsGrading(null);
    }
  };

  const handleGradeAll = async (regradeAll: boolean = false, selectedOnly: boolean = false) => {
    if (!isStrictlyAdmin || !results || results.length === 0) return;
    
    let resultsToProcess = results;
    
    if (selectedOnly) {
      resultsToProcess = resultsToProcess.filter(res => selectedLogs.includes(res.id));
    }

    if (!regradeAll) {
      resultsToProcess = resultsToProcess.filter(res => !res.correctAnswers);
    }

    if (resultsToProcess.length === 0) {
      toast({ title: "Grading Complete", description: "No qualifying results found to process." });
      return;
    }

    setIsGradingAll(true);
    let processedCount = 0;
    try {
      const resultsByExam: Record<string, any[]> = {};
      resultsToProcess.forEach(res => {
        if (!resultsByExam[res.examId]) resultsByExam[res.examId] = [];
        resultsByExam[res.examId].push(res);
      });

      await Promise.all(Object.entries(resultsByExam).map(async ([examId, examResults]) => {
        const answersRef = collection(db, `exams/${examId}/answers`);
        const answersSnap = await getDocs(answersRef);
        const answerKey: Record<string, number> = {};
        answersSnap.forEach(doc => { answerKey[doc.id] = doc.data().correctOptionIndex; });
        const totalQuestionsCount = Object.keys(answerKey).length;
        
        const batch = writeBatch(db);
        examResults.forEach(res => {
          let correct = 0;
          let incorrect = 0;
          let unanswered = 0;
          Object.keys(answerKey).forEach(qId => {
            const studentChoice = res.responses?.[qId];
            if (studentChoice === undefined) unanswered++;
            else if (answerKey[qId] === studentChoice) correct++;
            else incorrect++;
          });
          const score = totalQuestionsCount > 0 ? Math.round((correct / totalQuestionsCount) * 100) : 0;
          const resultRef = res.__path ? doc(db, res.__path) : doc(db, "users", res.studentId, "results", res.id);
          batch.update(resultRef, {
            score, correctCount: correct, incorrectCount: incorrect, unansweredCount: unanswered,
            totalQuestions: totalQuestionsCount, correctAnswers: answerKey, gradedAt: serverTimestamp()
          });
        });
        await batch.commit();
        processedCount += examResults.length;
      }));
      toast({ title: "Bulk Success", description: `Successfully processed ${processedCount} records.` });
      setSelectedLogs([]);
    } catch (e: any) { 
      toast({ title: "Bulk Processing Error", description: e.message, variant: "destructive" }); 
    } finally { 
      setIsGradingAll(false); 
    }
  };

  const handleGenerate = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!topic) return
    setIsGenerating(true)
    try {
      const ideas = await generateQuestionIdeas({ topic, difficultyLevel: 'medium' })
      setAiIdeas(ideas)
    } catch (error: any) {
      toast({ title: "AI Generation Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const parsedQuestions = results.data.map((row: any) => {
          const options = [
            row.option1 || row.Option1 || row['Option 1'],
            row.option2 || row.Option2 || row['Option 2'],
            row.option3 || row.Option3 || row['Option 3'],
            row.option4 || row.Option4 || row['Option 4'],
          ].filter(Boolean)
          
          const correctIndex = parseInt(row.correctIndex || row.correctOptionIndex || row['Correct Index']);

          if (!row.questionText && !row.Question && !row.text) return null;
          if (options.length < 2) return null;
          if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null;

          return {
            id: "q-" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            questionText: row.questionText || row.Question || row.text || "Untitled Question",
            options,
            correctOptionIndex: correctIndex
          }
        }).filter(Boolean);

        if (parsedQuestions.length > 0) {
          setExamQuestions(prev => [...prev, ...parsedQuestions])
          toast({ title: "Import Successful", description: `Added ${parsedQuestions.length} questions from CSV.` })
        } else {
          toast({ title: "Import Failed", description: "No valid questions found in CSV. Check your headers and correct indices.", variant: "destructive" })
        }
      },
      error: (err) => { toast({ title: "CSV Parsing Error", description: err.message, variant: "destructive" }) }
    })
    if (csvInputRef.current) csvInputRef.current.value = ""
  }

  const handleCsvPaste = () => {
    if (!csvPasteValue.trim()) return;
    Papa.parse(csvPasteValue, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedQuestions = results.data.map((row: any) => {
          const options = [
            row.option1 || row.Option1 || row['Option 1'],
            row.option2 || row.Option2 || row['Option 2'],
            row.option3 || row.Option3 || row['Option 3'],
            row.option4 || row.Option4 || row['Option 4'],
          ].filter(Boolean);

          const correctIndex = parseInt(row.correctIndex || row.correctOptionIndex || row['Correct Index']);
          
          if (!row.questionText && !row.Question && !row.text) return null;
          if (options.length < 2) return null;
          if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null;

          return {
            id: "q-" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            questionText: row.questionText || row.Question || row.text,
            options,
            correctOptionIndex: correctIndex
          };
        }).filter(Boolean);

        if (parsedQuestions.length > 0) {
          setExamQuestions(prev => [...prev, ...parsedQuestions]);
          toast({ title: "Import Successful", description: `Added ${parsedQuestions.length} questions from pasted CSV.` });
          setCsvPasteValue("");
          setIsPasteDialogOpen(false);
        } else {
          toast({ title: "Import Failed", description: "No valid questions found. Check your headers and indices.", variant: "destructive" });
        }
      },
      error: (err: Error) => { toast({ title: "CSV Parsing Error", description: err.message, variant: "destructive" }); }
    });
  };

  const handleAttachDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid File Type", description: "Please upload a PDF file for local parsing.", variant: "destructive" });
      return;
    }

    setIsAttachingDoc(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      const mcqRegex = /(\d+)\.\s+(.*?)\s*A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*?)(?:\s*Answer:\s*([A-D]))?/gi;
      
      const questions: any[] = [];
      let match;
      while ((match = mcqRegex.exec(fullText)) !== null) {
        const [_, num, qText, optA, optB, optC, optD, answer] = match;
        const options = [optA, optB, optC, optD].map(o => o?.trim() || "Option");
        
        let correctIndex = 0;
        if (answer) {
          correctIndex = answer.toUpperCase().charCodeAt(0) - 65;
        }
        
        if (qText && options.filter(Boolean).length >= 2) {
          questions.push({
            id: "q-" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            questionText: qText.trim(),
            options: options,
            correctOptionIndex: isNaN(correctIndex) ? 0 : Math.max(0, Math.min(options.length - 1, correctIndex))
          });
        }
      }

      if (questions.length > 0) {
        setExamQuestions(prev => [...prev, ...questions]);
        toast({ title: "Local PDF Parsed", description: `Successfully extracted ${questions.length} questions.` });
      } else {
        toast({ 
          title: "Import Failure", 
          description: "No questions matching the rule-based pattern were found.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ title: "Parsing Error", description: error.message || "Failed to parse PDF content.", variant: "destructive" });
    } finally {
      setIsAttachingDoc(false);
      if (attachDocInputRef.current) attachDocInputRef.current.value = "";
    }
  }

  const addQuestion = (q?: any) => {
    const formatted = {
      id: "q-" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      questionText: q?.questionText || "",
      options: q?.suggestedOptions || q?.options || ["", "", "", ""],
      correctOptionIndex: q?.correctOptionIndex || 0
    }
    setExamQuestions(prev => [...prev, formatted])
  }

  const removeQuestionCorrected = (id: string) => { setExamQuestions(prev => prev.filter(q => q.id !== id)) }

  const updateQuestion = (id: string, field: string, value: any) => {
    setExamQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const addOption = (qId: string) => {
    setExamQuestions(prev => prev.map(q => {
      if (q.id === qId && q.options.length < 5) return { ...q, options: [...q.options, ""] }
      return q
    }))
  }

  const removeOption = (qId: string, oIdx: number) => {
    setExamQuestions(prev => prev.map(q => {
      if (q.id === qId && q.options.length > 2) {
        const newOptions = q.options.filter((_: any, i: number = 0) => i !== oIdx)
        const newCorrectIndex = q.correctOptionIndex >= oIdx ? Math.max(0, q.correctOptionIndex - 1) : q.correctOptionIndex
        return { ...q, options: newOptions, correctOptionIndex: newCorrectIndex }
      }
      return q
    }))
  }

  const handleDeleteExam = () => {
    if (!examToDelete) return
    const examRef = doc(db, "exams", examToDelete)
    deleteDoc(examRef).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: examRef.path, operation: 'delete' }));
    });
    toast({ title: "Assessment deleted", description: "The assessment and its questions have been removed." })
    setExamToDelete(null)
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return
    const userRef = doc(db, "users", userToDelete)
    const adminRef = doc(db, "admin_roles", userToDelete)
    deleteDoc(userRef).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'delete' }));
    });
    deleteDoc(adminRef).catch(() => {});
    toast({ title: "User deleted", description: "The account has been removed." })
    setUserToDelete(null)
  }

  const handleDeleteLogs = async () => {
    if (!logsToDelete || logsToDelete.length === 0) return;
    const batch = writeBatch(db);
    let count = 0;
    logsToDelete.forEach(log => {
      const logRef = log.__path ? doc(db, log.__path) : (log.studentId && log.id ? doc(db, "users", log.studentId, "results", log.id) : null);
      if (logRef) { batch.delete(logRef); count++; }
    });
    try {
      if (count > 0) {
        await batch.commit();
        toast({ title: "Attempts deleted", description: `Removed ${count} attempt record(s).` });
      }
      setSelectedLogs([]);
    } catch (e: any) { toast({ title: "Could not delete attempts", description: e.message, variant: "destructive" }); }
    finally { setLogsToDelete(null); }
  };

  const toggleLogSelection = (id: string) => {
    setSelectedLogs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAllLogs = (resultsOnPage: any[]) => {
    if (resultsOnPage.length === 0) return;
    if (selectedLogs.length === resultsOnPage.length) setSelectedLogs([]);
    else setSelectedLogs(resultsOnPage.map(r => r.id));
  };

  const handleSaveExam = async (e: React.MouseEvent, status: "draft" | "published") => {
    e.preventDefault()
    if (!user) return
    if (!newExam.title || examQuestions.length === 0) {
      toast({ title: "Validation Error", description: "Exam must have a title and questions.", variant: "destructive" })
      return
    }
    const examId = editingExamId || doc(collection(db, "exams")).id
    const examRef = doc(db, "exams", examId)
    try {
      await setDoc(examRef, {
        ...newExam, id: examId, status: status, createdBy: user.uid, updatedAt: serverTimestamp(),
        ...(editingExamId ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });
      const batch = writeBatch(db);
      examQuestions.forEach(q => {
        const qId = q.id;
        const publicQRef = doc(db, `exams/${examId}/questions`, qId)
        const privateARef = doc(db, `exams/${examId}/answers`, qId)
        batch.set(publicQRef, { id: qId, examId, questionText: q.questionText, options: q.options }, { merge: true });
        batch.set(privateARef, { id: qId, correctOptionIndex: q.correctOptionIndex }, { merge: true });
      });
      await batch.commit();
      toast({ title: "Success", description: status === 'published' ? "Assessment published." : "Draft saved successfully." })
      setNewExam({ title: "", description: "", subject: "Others", timeLimitMinutes: 30, passingScore: 70, status: "draft", isPractice: false })
      setExamQuestions([]); 
      setEditingExamId(null); 
      localStorage.removeItem('admin_exam_draft')
      localStorage.removeItem('admin_questions_draft')
      setActiveTab("exams")
    } catch (e: any) { toast({ title: "Save Error", description: e.message, variant: "destructive" }) }
  }

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProvisioning(true)
    try {
      // Created on a secondary Firebase app so this does not sign the
      // administrator out — see src/firebase/provision-user.ts.
      const newUid = await createAuthAccount(newStudent.email, newStudent.password)
      const userRef = doc(db, "users", newUid)
      await setDoc(userRef, {
        id: newUid, email: newStudent.email, username: newStudent.username, role: newStudent.role, createdAt: serverTimestamp()
      });
      if (newStudent.role === 'admin') {
        const adminRef = doc(db, "admin_roles", newUid)
        await setDoc(adminRef, { uid: newUid, createdAt: serverTimestamp() }, { merge: true });
      }
      toast({ title: "User created", description: `Account created for ${newStudent.username}.` })
      setNewStudent({ email: "", password: "", username: "", role: "student" })
    } catch (error: any) { toast({ title: "Could not create user", description: error.message, variant: "destructive" }) }
    finally { setIsProvisioning(false) }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const userRef = doc(db, "users", editingUser.id)
    const adminMarkerRef = doc(db, "admin_roles", editingUser.id)
    try {
      await setDoc(userRef, { 
        username: editingUser.username || "", 
        role: editingUser.role || "student",
        email: editingUser.email || "" 
      }, { merge: true });
      
      const resultsRef = collectionGroup(db, "results")
      const q = query(resultsRef, where("studentId", "==", editingUser.id)) 
      const snap = await getDocs(q)
      const batch = writeBatch(db)
      let count = 0;
      snap.forEach(d => {
        batch.update(d.ref, { 
          studentUsername: editingUser.username || "",
          studentEmail: editingUser.email || ""
        })
        count++;
      })
      if (count > 0) await batch.commit()

      if (editingUser.role === 'admin') {
        await setDoc(adminMarkerRef, { uid: editingUser.id, createdAt: serverTimestamp() }, { merge: true });
      } else {
        await deleteDoc(adminMarkerRef);
      }
      toast({ title: "User updated", description: "Their name has been updated across all attempt records." })
      setEditingUser(null)
    } catch (error: any) { toast({ title: "Update Error", description: error.message, variant: "destructive" }) }
  }

  const handleDownloadCSV = () => {
    const dataToExport = selectedLogs.length > 0 
      ? filteredResults.filter(r => selectedLogs.includes(r.id))
      : filteredResults;

    if (dataToExport.length === 0) {
      toast({ title: "Export Error", description: "No results to export.", variant: "destructive" });
      return;
    }

    const csvData = dataToExport.map(res => {
      const examData = exams?.find(e => e.id === res.examId);
      const isGraded = !!res.correctAnswers;
      const isPassed = isGraded && (res.score || 0) >= (examData?.passingScore || 0);
      const attemptDate = getSafeDate(res.startedAt);
      const liveName = getStudentLiveName(res.studentId, res.studentUsername);

      return {
        StudentName: liveName,
        Email: res.studentEmail,
        ExamTitle: res.examTitle,
        Date: attemptDate ? format(attemptDate, 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        Score: `${res.score || 0}%`,
        Outcome: isGraded ? (isPassed ? "PASS" : "FAIL") : "Unmarked",
        Integrity: res.integrityStatus,
        TotalQuestions: res.totalQuestions || 0,
        CorrectCount: res.correctCount || 0
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Successful", description: `Exported ${dataToExport.length} records to CSV.` });
  };

  const handleDownloadExamCSV = async (examId: string, examTitle: string) => {
    try {
      const questionsRef = collection(db, `exams/${examId}/questions`);
      const answersRef = collection(db, `exams/${examId}/answers`);
      
      const [questionsSnap, answersSnap] = await Promise.all([
        getDocs(questionsRef),
        getDocs(answersRef)
      ]);

      const answersMap: Record<string, number> = {};
      answersSnap.forEach(doc => {
        answersMap[doc.id] = doc.data().correctOptionIndex;
      });

      const csvData = questionsSnap.docs.map(doc => {
        const q = doc.data();
        const correctIndex = answersMap[doc.id];
        return {
          questionText: q.questionText,
          option1: q.options?.[0] || "",
          option2: q.options?.[1] || "",
          option3: q.options?.[2] || "",
          option4: q.options?.[3] || "",
          correctIndex: correctIndex ?? 0
        };
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${examTitle.replace(/\s+/g, '_')}_questions.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Export Successful", description: `Exported ${csvData.length} questions to CSV.` });
    } catch (e: any) {
      toast({ title: "Export Error", description: e.message, variant: "destructive" });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => {
      const matchesSearch = (u.username?.toLowerCase() || "").includes(userSearch.toLowerCase()) || 
                            (u.email?.toLowerCase() || "").includes(userSearch.toLowerCase())
      const matchesRole = roleFilter === "all" || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [allUsers, userSearch, roleFilter])

  const filteredResults = useMemo(() => {
    const rawData = results || [];

    return rawData.filter(res => {
      const examData = exams?.find(e => e.id === res.examId);
      const isGraded = !!res.correctAnswers;
      const isPassed = isGraded && (res.score || 0) >= (examData?.passingScore || 0);
      const attemptDate = getSafeDate(res.startedAt);
      const liveName = getStudentLiveName(res.studentId, res.studentUsername);
      const matchesSearch = (res.studentEmail?.toLowerCase() || "").includes(auditSearch.toLowerCase()) || 
                            (liveName?.toLowerCase() || "").includes(auditSearch.toLowerCase()) || 
                            (res.examTitle?.toLowerCase() || "").includes(auditSearch.toLowerCase())
      const matchesExam = auditExamFilter === "all" || res.examTitle === auditExamFilter
      const matchesStatus = auditStatusFilter === "all" || res.integrityStatus === auditStatusFilter
      let matchesOutcome = true;
      if (outcomeFilter === "pass") matchesOutcome = isGraded && isPassed;
      else if (outcomeFilter === "fail") matchesOutcome = isGraded && !isPassed;
      else if (outcomeFilter === "unmarked") matchesOutcome = !isGraded;
      const matchesDate = !dateFilter || (attemptDate && isSameDay(attemptDate, dateFilter));
      let matchesTime = true;
      if (timeFilter !== "all" && attemptDate) matchesTime = getHours(attemptDate) === parseInt(timeFilter);
      return matchesSearch && matchesExam && matchesStatus && matchesOutcome && matchesDate && matchesTime;
    })
  }, [results, auditSearch, auditExamFilter, auditStatusFilter, outcomeFilter, dateFilter, timeFilter, exams, allUsers])

  const studentPerformanceData = useMemo(() => {
    if (!results || !allUsers) return [];
    const stats: Record<string, { id: string; name: string; email: string; totalScore: number; examsTaken: number }> = {};

    results.forEach(res => {
      if (!res.correctAnswers || !res.studentId) return; 
      
      const studentId = res.studentId;
      if (!stats[studentId]) {
        const liveName = getStudentLiveName(studentId, res.studentUsername);
        stats[studentId] = {
          id: studentId,
          name: liveName,
          email: res.studentEmail || "",
          totalScore: 0,
          examsTaken: 0
        };
      }
      
      const currentName = getStudentLiveName(studentId, res.studentUsername);
      if (currentName !== "Student") {
        stats[studentId].name = currentName;
      }

      stats[studentId].totalScore += (res.score || 0);
      stats[studentId].examsTaken += 1;
    });

    return Object.values(stats)
      .map(s => ({
        ...s,
        avgScore: Math.round(s.totalScore / s.examsTaken)
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results, allUsers]);

  const filteredExamsForVault = useMemo(() => {
    if (!exams) return [];
    if (vaultSubject === "All") return exams.filter(e => !e.isPractice);
    if (vaultSubject === "Practice") return exams.filter(e => !!e.isPractice);
    return exams.filter(e => e.subject === vaultSubject && !e.isPractice);
  }, [exams, vaultSubject]);

  const uniqueExamTitles = useMemo(() => {
    const titles = new Set<string>();
    results?.forEach(res => { if (res.examTitle) titles.add(res.examTitle) });
    return Array.from(titles).sort();
  }, [results])

  const availableHours = useMemo(() => {
    if (!results) return [];
    const hours = new Set<number>();
    results.forEach(res => {
      const d = getSafeDate(res.startedAt);
      if (d && (!dateFilter || isSameDay(d, dateFilter))) hours.add(getHours(d));
    });
    return Array.from(hours).sort((a, b) => a - b);
  }, [results, dateFilter]);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "exams", label: "Assessments", icon: FileText },
    { id: "authoring", label: "Builder", icon: Sparkles },
    { id: "students", label: "Users", icon: UserCog },
    { id: "audit", label: "Attempts", icon: History },
    { id: "performance", label: "Performance", icon: BarChart3 },
  ]

  const handleAnalyzePerformance = async () => {
    setIsAnalyzingPerformance(true);
    setPerformanceInsights(null);
    try {
      if (!results || results.length === 0) {
        toast({ title: 'No results', description: 'Need student attempts to analyze.' });
        setIsAnalyzingPerformance(false);
        return;
      }
      
      const missedQuestionsTexts = new Set<string>();
      for (const result of results) {
        const { responses, correctAnswers, examId } = result;
        if (!responses || !correctAnswers || !examId) continue;
        
        for (const [qId, ans] of Object.entries(responses)) {
          if (ans !== correctAnswers[qId]) {
            const qDoc = await getDoc(doc(db, 'exams', examId, 'questions', qId));
            if (qDoc.exists()) {
              missedQuestionsTexts.add(qDoc.data().questionText);
            }
          }
        }
      }
      
      const missedList = Array.from(missedQuestionsTexts);
      if (missedList.length === 0) {
         toast({ title: 'No missed questions', description: 'Everyone is scoring 100%!' });
         setIsAnalyzingPerformance(false);
         return;
      }
      
      const { analyzePerformanceInsights } = await import('@/ai/flows/admin-performance-analyzer');
      const analysis = await analyzePerformanceInsights({ missedQuestions: missedList });
      setPerformanceInsights(analysis);
    } catch (err: any) {
      toast({ title: 'Analysis Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzingPerformance(false);
    }
  };

  if (!mounted || isUserLoading || adminRoleLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background" suppressHydrationWarning>
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  )

  if (!isStrictlyAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-lg">You don't have access to this page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This area is for administrators. If you think this is a mistake, ask an
            administrator to check your account.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard/student')}>Go to my dashboard</Button>
            <Button variant="outline" onClick={() => router.push('/')}>Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const activeNavLabel = navItems.find(n => n.id === activeTab)?.label ?? ""

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn("bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 hidden md:flex flex-col z-50", isSidebarOpen ? "w-60" : "w-16")}>
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4 py-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <img src="/logo.png" alt="Logo" className="h-6 w-6 shrink-0 object-contain" />
          {isSidebarOpen && <span className="font-semibold text-sm tracking-tight truncate">Assessment</span>}
        </div>
        <nav className="flex-1 p-2 space-y-0.5" aria-label="Admin sections">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id !== 'authoring') setEditingExamId(null); }}
              aria-current={activeTab === item.id ? "page" : undefined}
              title={!isSidebarOpen ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors",
                !isSidebarOpen && "justify-center px-0",
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {isSidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card sticky top-0 z-40 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex shrink-0" aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              <Menu className="w-4 h-4" aria-hidden="true" />
            </Button>
            <h1 className="font-semibold text-sm truncate">{activeNavLabel}</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Assessments", value: stats.exams, icon: FileText },
                  { label: "Users", value: stats.users, icon: Users },
                  { label: "Attempts", value: stats.attempts, icon: History },
                  { label: "Flagged attempts", value: stats.alerts, icon: ShieldAlert },
                ].map((stat, i) => (
                  <div key={`stat-${i}`} className="rounded-lg border border-border bg-card p-4">
                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <stat.icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {stat.label}
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold tabular-nums">{stat.value ?? 0}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Question ideas</CardTitle><CardDescription>Optional AI assist. Suggestions are drafts — review every one before using it.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2"><Input placeholder="e.g. Percentages" value={topic || ""} onChange={(e) => setTopic(e.target.value)} aria-label="Topic for question ideas" /><Button onClick={handleGenerate} disabled={isGenerating || !topic}>{isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Generating</> : "Generate"}</Button></div>
                    {aiIdeas && (
                      <ScrollArea className="h-64 rounded-xl border p-4">
                        <div className="space-y-4">
                          {aiIdeas.questions.map((q, idx) => (
                            <div key={`idea-${idx}`} className="p-4 rounded-lg bg-muted border group flex items-center justify-between">
                              <p className="font-bold text-sm">{q.questionText}</p>
                              <Button variant="outline" size="sm" className="h-8" onClick={() => { addQuestion(q); setActiveTab("authoring"); }}>Import <Plus className="ml-1 w-3 h-3" /></Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Recent assessments</CardTitle><CardDescription>Jump straight into editing.</CardDescription></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {examsLoading ? (<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>) : (
                        <div className="space-y-3">
                          {exams?.map((exam) => (
                            <div key={exam.id} className="flex items-center justify-between p-4 rounded-xl bg-muted border">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">{exam.title}</p>
                                  {exam.isPractice && <Badge variant="outline" className="text-[10px]">Practice</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-muted-foreground uppercase">{exam.subject} • {exam.timeLimitMinutes} min</p>
                                  <Badge variant={exam.status === 'published' ? 'default' : 'secondary'} className="text-[8px] h-4 px-1 font-bold uppercase">{exam.status === 'published' ? 'PUBLISHED' : 'DRAFT'}</Badge>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleEditExam(exam.id)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-8 mt-8">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> AI Performance Analyst
                      </CardTitle>
                      <CardDescription>Analyze all student attempts to find common weaknesses and learning gaps.</CardDescription>
                    </div>
                    <Button onClick={handleAnalyzePerformance} disabled={isAnalyzingPerformance}>
                      {isAnalyzingPerformance ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing</> : "Run Analysis"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {performanceInsights ? (
                      <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Weak Topics Detected</h4>
                          <div className="flex flex-wrap gap-2">
                            {performanceInsights.weakTopics.map((topic: string, i: number) => (
                              <Badge key={i} variant="secondary">{topic}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1 mt-3">Analysis</h4>
                          <p className="text-sm text-muted-foreground">{performanceInsights.analysisSummary}</p>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg mt-3 border border-primary/20">
                          <h4 className="text-sm font-semibold mb-1 text-primary">Recommended Action</h4>
                          <p className="text-sm text-foreground">{performanceInsights.recommendedAction}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                        Click "Run Analysis" to let Gemini review student mistakes and generate a performance report.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-6">
               <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                   <div className="space-y-1"><h2 className="text-lg font-semibold tracking-tight">Assessments</h2><p className="text-sm text-muted-foreground">Create, edit and publish assessments.</p></div>
                   <Button onClick={() => { setActiveTab('authoring'); setEditingExamId(null); setExamQuestions([]); setNewExam({ title: "", description: "", subject: "Others", timeLimitMinutes: 30, passingScore: 70, status: "draft", isPractice: false }); }} className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> New assessment</Button>
                 </div>
                 <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button variant={vaultSubject === 'All' ? 'default' : 'outline'} size="sm" onClick={() => setVaultSubject('All')} className="rounded-md">All</Button>
                    <Button variant={vaultSubject === 'Practice' ? 'default' : 'outline'} size="sm" onClick={() => setVaultSubject('Practice')} className="rounded-md whitespace-nowrap">Practice</Button>
                    {SUBJECTS.map((subject) => (<Button key={subject} variant={vaultSubject === subject ? 'default' : 'outline'} size="sm" onClick={() => setVaultSubject(subject)} className="rounded-md whitespace-nowrap">{subject}</Button>))}
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {examsLoading ? (<div className="col-span-full flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>) : (
                   filteredExamsForVault?.map((exam) => (
                     <Card key={exam.id} className="hover:border-primary transition-all overflow-hidden flex flex-col group/card shadow-sm">
                       <CardHeader>
                         <div className="flex items-center justify-between mb-2">
                           <Badge variant="outline" className="uppercase text-[10px] font-bold border-primary/20 text-primary">{exam.subject || "Others"}</Badge>
                           <div className="flex items-center gap-2">
                             {exam.isPractice && <Badge variant="outline" className="text-[10px]">Practice</Badge>}
                             <span className="text-[10px] text-muted-foreground uppercase font-bold">{exam.timeLimitMinutes}m Limit</span>
                           </div>
                         </div>
                         <CardTitle className="text-lg group-hover/card:text-primary transition-colors">{exam.title}</CardTitle><CardDescription className="line-clamp-2">{exam.description}</CardDescription>
                       </CardHeader>
                       <CardContent className="flex items-center justify-between bg-muted/20 py-4 mt-auto border-t">
                          <div className="flex flex-col gap-1"><span className="text-xs font-bold text-muted-foreground uppercase">Pass: {exam.passingScore}%</span><Badge variant={exam.status === 'published' ? 'default' : 'secondary'} className="w-fit text-[8px] px-1 py-0 h-4">{exam.status === 'published' ? 'PUBLISHED' : 'DRAFT'}</Badge></div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadExamCSV(exam.id, exam.title)} className="h-8 text-primary hover:bg-primary/5"><Download className="w-3.5 h-3.5 mr-1.5" /> CSV</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditExam(exam.id)} className="h-8"><Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
                            <Button variant="ghost" size="sm" className="text-destructive h-8 hover:bg-destructive/10" onClick={() => setExamToDelete(exam.id)}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete</Button>
                          </div>
                       </CardContent>
                     </Card>
                   ))
                 )}
               </div>
            </div>
          )}

          {activeTab === 'authoring' && (
            <div className="max-w-4xl mx-auto space-y-8">
               <div className="space-y-1"><h2 className="text-lg font-semibold tracking-tight">{editingExamId ? "Edit assessment" : "New assessment"}</h2><p className="text-sm text-muted-foreground">Your draft is saved in this browser as you type.</p></div>
               {isLoadingExam ? (<div className="flex flex-col items-center justify-center p-16 gap-3" suppressHydrationWarning><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Loading assessment…</p></div>) : (
                 <>
                   <Card className="border-none shadow-sm p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Exam Title</Label><Input value={newExam.title || ""} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. Cybersecurity Fundamentals" /></div>
                        <div className="space-y-2"><Label>Subject</Label><Select value={newExam.subject} onValueChange={v => setNewExam({...newExam, subject: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Time Limit (Min)</Label><Input type="number" value={newExam.timeLimitMinutes || 30} onChange={e => setNewExam({...newExam, timeLimitMinutes: parseInt(e.target.value) || 0})} /></div>
                        <div className="space-y-2"><Label>Passing Score (%)</Label><Input type="number" value={newExam.passingScore || 70} onChange={e => setNewExam({...newExam, passingScore: parseInt(e.target.value) || 0})} /></div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center space-x-2 pt-2 mb-4">
                            <Switch id="practice-mode" checked={newExam.isPractice} onCheckedChange={v => setNewExam({...newExam, isPractice: v})} />
                            <Label htmlFor="practice-mode" className="font-bold cursor-pointer">Practice Mode (Unlimited Time, Instant Results)</Label>
                          </div>
                          <Label>Instructions</Label>
                          <Textarea value={newExam.description || ""} onChange={e => setNewExam({...newExam, description: e.target.value})} />
                        </div>
                      </div>
                   </Card>
                   <div className="space-y-4 pb-24">
                     <div className="flex items-center justify-between">
                       <h3 className="text-xl font-bold">Questions ({examQuestions.length})</h3>
                       <div className="flex gap-2">
                         <Input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCsvUpload} />
                         <Input type="file" accept=".pdf" className="hidden" ref={attachDocInputRef} onChange={handleAttachDocument} />
                         
                         <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><ClipboardList className="w-4 h-4 mr-2" /> Paste CSV</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Paste CSV Content</DialogTitle>
                                <DialogDescription>
                                  Headers: <b>questionText, option1, option2, option3, option4, correctIndex</b> (0-3).
                                </DialogDescription>
                            </DialogHeader>
                            <Textarea 
                              className="min-h-[300px] font-mono text-xs" 
                              placeholder="questionText,option1,option2,option3,option4,correctIndex"
                              value={csvPasteValue || ""}
                              onChange={(e) => setCsvPasteValue(e.target.value)}
                            />
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleCsvPaste}>Import</Button>
                            </DialogFooter>
                          </DialogContent>
                         </Dialog>

                         <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> CSV Upload</Button>
                         
                         <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => attachDocInputRef.current?.click()} disabled={isAttachingDoc}>
                            {isAttachingDoc ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSearch className="w-4 h-4 mr-2" />}
                            Local PDF Import
                          </Button>
                          <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Info className="w-4 h-4" /></Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-80">
                               <div className="space-y-3">
                                 <h4 className="font-bold text-sm">PDF Rules</h4>
                                 <ul className="text-xs space-y-2 list-disc pl-4 text-muted-foreground">
                                   <li>Numbering: <b>1. Question text</b></li>
                                   <li>Options: <b>A) Option text</b></li>
                                   <li>Answer: <b>Answer: B</b> (Optional, defaults to A)</li>
                                 </ul>
                               </div>
                             </PopoverContent>
                           </Popover>
                         </div>
                       </div>
                     </div>
                     {examQuestions.map((q, idx) => (
                       <Card key={q.id} className="shadow-sm border-none overflow-hidden">
                          <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/20"><Badge className="bg-primary px-4 py-1 rounded-full text-sm font-medium">Question {idx + 1}</Badge><Button variant="ghost" size="icon" onClick={() => removeQuestionCorrected(q.id)} className="text-destructive"><Trash2 className="w-5 h-5" /></Button></CardHeader>
                          <CardContent className="space-y-6 pt-6">
                            <div className="space-y-3"><Label className="text-sm font-bold text-foreground/80 uppercase">Question Text</Label><Input value={q.questionText || ""} onChange={e => updateQuestion(q.id, 'questionText', e.target.value)} className="h-12 rounded-xl" /></div>
                            <div className="space-y-4">
                              <RadioGroup value={(q.correctOptionIndex ?? 0).toString()} onValueChange={v => updateQuestion(q.id, 'correctOptionIndex', parseInt(v))} className="grid grid-cols-1 gap-3">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <div key={`${q.id}-opt-${oIdx}`} className={cn("flex items-center gap-3 p-2 pr-4 rounded-xl border", q.correctOptionIndex === oIdx ? "bg-success/10 border-success/50" : "bg-muted/20 border-border")}>
                                    <div className="pl-3"><RadioGroupItem value={oIdx.toString()} className="h-5 w-5" /></div>
                                    <Input value={opt || ""} onChange={e => { const opts = [...q.options]; opts[oIdx] = e.target.value; updateQuestion(q.id, 'options', opts); }} className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-10 text-sm font-medium" />
                                    {q.correctOptionIndex === oIdx && <Badge variant="outline" className="text-[10px] border-success/50 text-success">Correct</Badge>}
                                    {q.options.length > 2 && (<Button variant="ghost" size="icon" onClick={() => removeOption(q.id, oIdx)} className="h-7 w-7"><X className="w-4 h-4" /></Button>)}
                                  </div>
                                ))}
                              </RadioGroup>
                              <Button type="button" variant="ghost" size="sm" onClick={() => addOption(q.id)} disabled={q.options.length >= 5} className="text-xs font-bold text-primary/80">+ Add Distractor</Button>
                            </div>
                          </CardContent>
                       </Card>
                     ))}
                     <div className="flex justify-center pt-4"><Button variant="outline" onClick={() => addQuestion()} className="gap-2 border-dashed border-2 px-8"><Plus className="w-4 h-4" /> Append Question</Button></div>
                   </div>
                   <div className="fixed bottom-8 right-8 z-50 flex gap-4"><Button variant="outline" onClick={() => { setActiveTab('exams'); setEditingExamId(null); setExamQuestions([]); setNewExam({ title: "", description: "", subject: "Others", timeLimitMinutes: 30, passingScore: 70, status: "draft", isPractice: false }); localStorage.removeItem('admin_exam_draft'); localStorage.removeItem('admin_questions_draft'); }} className="px-6 py-6 rounded-2xl bg-background/80">Discard</Button><Button variant="secondary" className="px-8 py-6 rounded-2xl shadow-xl" onClick={(e) => handleSaveExam(e, "draft")}><Save className="w-4 h-4 mr-2" /> Save Draft</Button><Button className="px-10 py-6 text-lg shadow-2xl btn-premium rounded-2xl" onClick={(e) => handleSaveExam(e, "published")}><Send className="w-4 h-4 mr-2" /> Publish</Button></div>
                 </>
               )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-8 h-full flex flex-col">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="space-y-1"><h2 className="text-lg font-semibold tracking-tight">Users</h2><p className="text-sm text-muted-foreground">Students and administrators on this institution.</p></div>
                 <div className="flex items-center gap-2">
                    <Dialog><DialogTrigger asChild><Button className="gap-2"><UserPlus className="w-4 h-4" aria-hidden="true" /> Add user</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add a user</DialogTitle><DialogDescription>They can change their password later from the sign-in screen.</DialogDescription></DialogHeader>
                        <form onSubmit={handleProvisionUser} className="space-y-4 pt-2">
                            <div className="space-y-2"><Label htmlFor="new-user-name">Full name</Label><Input id="new-user-name" required value={newStudent.username || ""} onChange={e => setNewStudent({...newStudent, username: e.target.value})} /></div>
                            <div className="space-y-2"><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" required type="email" value={newStudent.email || ""} onChange={e => setNewStudent({...newStudent, email: e.target.value})} /></div>
                            <div className="space-y-2"><Label htmlFor="new-user-password">Temporary password</Label><Input id="new-user-password" required type="password" value={newStudent.password || ""} onChange={e => setNewStudent({...newStudent, password: e.target.value})} /></div>
                            <div className="space-y-2"><Label htmlFor="new-user-role">Role</Label><Select value={newStudent.role} onValueChange={(v: any) => setNewStudent({...newStudent, role: v})}><SelectTrigger id="new-user-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select></div>
                            <Button type="submit" className="w-full" disabled={isProvisioning}>{isProvisioning && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Create account</Button>
                        </form></DialogContent></Dialog>
                 </div>
               </div>
               <Card className="border-none shadow-sm overflow-hidden flex-1 flex flex-col">
                 <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search users" className="pl-10" value={userSearch || ""} onChange={(e) => setUserSearch(e.target.value)} /></div>
                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
                    <Button variant="ghost" size="icon" onClick={() => { setUserSearch(""); setRoleFilter("all"); }}><RefreshCcw className="w-4 h-4" /></Button>
                 </div>
                 <ScrollArea className="flex-1">
                   {usersLoading ? (
                     <div className="flex flex-col items-center justify-center p-20 gap-4">
                       <Loader2 className="w-8 h-8 animate-spin text-primary" />
                       <p className="text-sm text-muted-foreground">Loading users…</p>
                     </div>
                   ) : (
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Name</TableHead>
                           <TableHead>Email</TableHead>
                           <TableHead>Role</TableHead>
                           <TableHead className="text-right">Action</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {filteredUsers && filteredUsers.length > 0 ? (
                           filteredUsers.map((u) => {
                             const isTargetAdmin = u.role === 'admin';
                             return (
                               <TableRow key={u.id} className="group">
                                 <TableCell className="font-bold flex items-center gap-2">{u.username || "Unknown"}{isTargetAdmin && <Shield className="w-3 h-3 text-primary" />}</TableCell>
                                 <TableCell>{u.email}</TableCell>
                                 <TableCell><Badge variant={isTargetAdmin ? 'default' : 'secondary'} className="capitalize">{u.role}</Badge></TableCell>
                                 <TableCell className="text-right">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="sm" onClick={() => setEditingUser(u)}><Edit2 className="w-3 h-3" /></Button>
                                     <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setUserToDelete(u.id)}><Trash2 className="w-3 h-3" /></Button>
                                   </div>
                                 </TableCell>
                               </TableRow>
                             );
                           })
                         ) : (
                           <TableRow>
                             <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                               No users match your criteria.
                             </TableCell>
                           </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   )}
                 </ScrollArea>
               </Card>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1"><h2 className="text-lg font-semibold tracking-tight">Attempts</h2><p className="text-sm text-muted-foreground">Every student attempt, with grading and export.</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                  {selectedLogs.length > 0 && (<Button variant="destructive" className="gap-2" onClick={() => { setLogsToDelete(filteredResults?.filter(r => selectedLogs.includes(r.id)) || []); }}><Trash2 className="w-4 h-4" /> Delete ({selectedLogs.length})</Button>)}
                  
                  {selectedLogs.length > 0 ? (
                    <>
                      <Button variant="secondary" onClick={() => handleGradeAll(true, true)} disabled={isGradingAll} className="gap-2">
                        {isGradingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Regrade Selected
                      </Button>
                      <Button onClick={() => handleGradeAll(false, true)} disabled={isGradingAll} className="gap-2">
                        {isGradingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Grade Selected
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => handleGradeAll(true, false)} disabled={isGradingAll || !results || results.length === 0} className="gap-2">
                        {isGradingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Regrade All
                      </Button>
                      <Button onClick={() => handleGradeAll(false, false)} disabled={isGradingAll || !results || results.length === 0} className="gap-2">
                        {isGradingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Grade Pending
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Card className="border-none shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/20 flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[300px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search logs..." className="pl-10" value={auditSearch || ""} onChange={(e) => setAuditSearch(e.target.value)} /></div>
                  <Select value={auditExamFilter} onValueChange={setAuditExamFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Exam" /></SelectTrigger><SelectContent><SelectItem value="all">All Exams</SelectItem>{uniqueExamTitles.map(title => (<SelectItem key={title} value={title}>{title}</SelectItem>))}</SelectContent></Select>
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="w-[160px]"><CalendarIcon className="mr-2 h-4 w-4" />{dateFilter ? format(dateFilter, "MMM dd") : "Date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus /><div className="p-3 border-t"><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateFilter(undefined)}>Clear</Button></div></PopoverContent></Popover>
                  <Select value={timeFilter} onValueChange={setTimeFilter}><SelectTrigger className="w-[140px]"><Clock className="w-4 h-4 mr-2" /><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{availableHours.map(hour => (<SelectItem key={hour} value={hour.toString()}>{hour < 12 ? `${hour} AM` : `${hour === 12 ? 12 : hour - 12} PM`}</SelectItem>))}</SelectContent></Select>
                  <Select value={outcomeFilter} onValueChange={setOutcomeFilter}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Outcome" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="unmarked">Unmarked</SelectItem></SelectContent></Select>
                </div>
                <Table><TableHeader><TableRow><TableHead className="w-[50px]"><Checkbox checked={filteredResults?.length > 0 && selectedLogs.length === filteredResults?.length} onCheckedChange={() => toggleAllLogs(filteredResults || [])} /></TableHead><TableHead>Student</TableHead><TableHead>Assessment</TableHead><TableHead>Time</TableHead><TableHead>Score</TableHead><TableHead>Outcome</TableHead><TableHead>Integrity</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                  {filteredResults?.map((res) => {
                    const examData = exams?.find(e => e.id === res.examId);
                    const isGraded = !!res.correctAnswers;
                    const isPassed = isGraded && (res.score || 0) >= (examData?.passingScore || 0);
                    const attemptDate = getSafeDate(res.startedAt);
                    const liveName = getStudentLiveName(res.studentId, res.studentUsername);
                    return (
                      <TableRow key={res.id} className={cn(selectedLogs.includes(res.id) && "bg-muted/50")}>
                        <TableCell><Checkbox checked={selectedLogs.includes(res.id)} onCheckedChange={() => toggleLogSelection(res.id)} /></TableCell>
                        <TableCell><div className="flex flex-col"><span className="text-sm font-bold">{liveName}</span><span className="text-[10px] text-muted-foreground">{res.studentEmail}</span></div></TableCell>
                        <TableCell>{res.examTitle}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{attemptDate ? format(attemptDate, 'MMM dd, hh:mm a') : 'N/A'}</TableCell>
                        <TableCell><span className="font-bold text-primary">{res.score || 0}%</span></TableCell>
                        <TableCell>{isGraded ? (<Badge variant={isPassed ? 'default' : 'destructive'} >{isPassed ? "Passed" : "Not passed"}</Badge>) : (<span className="text-[10px] italic">Unmarked</span>)}</TableCell>
                        <TableCell><Badge variant={res.integrityStatus === 'Clean' ? 'outline' : 'destructive'}>{res.integrityStatus}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleGradeResult(res)} 
                                    disabled={isGrading === res.id}
                                    className="h-8 w-8 p-0"
                                  >
                                    {isGrading === res.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (res.correctAnswers ? <RotateCcw className="w-4 h-4" /> : <Calculator className="w-4 h-4" />)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{res.correctAnswers ? "Regrade" : "Grade"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => setLogsToDelete([res])}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody></Table>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">Performance</h2>
                  <p className="text-sm text-muted-foreground">Insights into global student excellence.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Leaderboard</CardTitle>
                    <CardDescription>Ranks based on aggregate average scores.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Avg. Score</TableHead>
                          <TableHead className="text-right">Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentPerformanceData.map((s, i) => (
                          <TableRow key={`perf-leaderboard-${s.id}-${i}`} className="group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {i === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                                {i === 1 && <Medal className="w-4 h-4 text-slate-400" />}
                                {i === 2 && <Medal className="w-4 h-4 text-amber-700" />}
                                {i > 2 && <span className="text-muted-foreground font-mono text-xs">#{i + 1}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold">{s.name}</span>
                                <span className="text-[10px] text-muted-foreground">{s.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">{s.examsTaken}</Badge>
                            </TableCell>
                            <TableCell className="font-bold text-primary">{s.avgScore}%</TableCell>
                            <TableCell className="text-right">
                               <div className="flex justify-end">
                                  <Progress value={s.avgScore || 0} className="w-24 h-1.5" />
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Subject Excellence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {SUBJECTS.filter(s => s !== "Others").map(subj => {
                         const topInSubj = results?.filter(r => r.correctAnswers && exams?.find(e => e.id === r.examId)?.subject === subj)
                           .sort((a,b) => (b.score || 0) - (a.score || 0))[0];
                         
                         if (!topInSubj) return null;

                         return (
                           <div key={`subj-exc-${subj}`} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-transparent">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{subj}</p>
                                <p className="text-sm font-bold truncate max-w-[120px]">{getStudentLiveName(topInSubj.studentId, topInSubj.studentUsername)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold">{topInSubj.score}%</p>
                              </div>
                           </div>
                         )
                       })}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Username</Label><Input value={editingUser.username || ""} onChange={e => setEditingUser({...editingUser, username: e.target.value})} /></div>
              <div className="space-y-2"><Label>Email Address</Label><Input value={editingUser.email || ""} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editingUser.role || "student"} onValueChange={(v: any) => setEditingUser({...editingUser, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4"><Button variant="outline" type="button" onClick={() => setEditingUser(null)}>Cancel</Button><Button type="submit">Save Changes</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Assessment?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteExam} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this user?</AlertDialogTitle><AlertDialogDescription>Their account and profile will be removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete user</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!logsToDelete} onOpenChange={(open) => !open && setLogsToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete these attempts?</AlertDialogTitle><AlertDialogDescription>The selected attempt records will be removed permanently. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete attempts</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
