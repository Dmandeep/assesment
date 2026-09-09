"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  BookOpen,
  Trophy,
  ChevronRight,
  LogOut,
  Target,
  History,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  Search,
  Lock,
  GraduationCap,
  AlertTriangle,
  Inbox,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where, getDocs, setDoc, collectionGroup, writeBatch, orderBy, limit, getCountFromServer } from "firebase/firestore"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ModeToggle } from "@/components/mode-toggle"

const getSafeDate = (dateVal: any) => {
  if (!dateVal) return null;
  if (dateVal.toDate) return dateVal.toDate();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  )
}

function StudentDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "exams")
  const [reviewResult, setReviewResult] = useState<any>(null)
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([])
  const [loadingReview, setLoadingReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<"all" | "incorrect" | "correct">("all")

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("All Subjects")

  const [localPracticeResults, setLocalPracticeResults] = useState<any[]>([])
  const [cachedLeaderboard, setCachedLeaderboard] = useState<any[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const storedLeaderboard = localStorage.getItem('scholar_leaderboard_cache')
    if (storedLeaderboard) setCachedLeaderboard(JSON.parse(storedLeaderboard))

    const storedPractice = localStorage.getItem('practice_results')
    if (storedPractice) setLocalPracticeResults(JSON.parse(storedPractice))
  }, [])

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  const { data: userProfile, isLoading: profileLoading } = useDoc(userDocRef)

  useEffect(() => {
    if (userProfile?.username) {
      setNewUsername(userProfile.username)
    }
  }, [userProfile])

  const examsQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(collection(db, "exams"), where("status", "==", "published"))
  }, [db, user])
  const { data: exams, isLoading: examsLoading } = useCollection(examsQuery)

  const resultsQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(collection(db, "users", user.uid, "results"), orderBy("startedAt", "desc"), limit(20))
  }, [db, user])
  const { data: results, isLoading: resultsLoading } = useCollection(resultsQuery)

  const combinedResults = useMemo(() => {
    const fsResults = results || [];
    const all = [...fsResults, ...localPracticeResults];
    return all.sort((a, b) => {
      const da = getSafeDate(a.startedAt || a.completedAt)?.getTime() || 0;
      const db = getSafeDate(b.startedAt || b.completedAt)?.getTime() || 0;
      return db - da;
    });
  }, [results, localPracticeResults]);

  const stats = useMemo(() => {
    const totalTaken = combinedResults.length;
    const avgScore = totalTaken ? Math.round(combinedResults.reduce((acc, res) => acc + (res.score || 0), 0) / totalTaken) : 0;
    const latestScore = totalTaken ? combinedResults[0].score || 0 : 0;
    const flags = combinedResults.filter(r => r.integrityStatus === 'Flagged').length;
    return { totalTaken, avgScore, latestScore, flags };
  }, [combinedResults]);

  const globalResultsQuery = useMemoFirebase(() => {
    if (!user || activeTab !== 'leaderboard') return null
    return query(
      collectionGroup(db, "results"),
      where("score", ">=", 0),
      orderBy("score", "desc"),
      limit(100)
    )
  }, [db, user, activeTab])
  const { data: globalResults, isLoading: globalLoading } = useCollection(globalResultsQuery)

  useEffect(() => {
    if (!db || !user || stats.avgScore === 0) return;

    const calculateRank = async () => {
      try {
        const q = query(
          collectionGroup(db, "results"),
          where("score", ">", stats.avgScore)
        );
        const snapshot = await getCountFromServer(q);
        setUserRank(snapshot.data().count + 1);
      } catch (e) {
        console.error("Rank fetch error", e);
      }
    };

    calculateRank();
  }, [db, user?.uid, stats.avgScore]);

  const leaderboardData = useMemo(() => {
    if (!globalResults) return cachedLeaderboard;
    const studentStats: Record<string, { id: string; name: string; totalScore: number; examsTaken: number }> = {};

    globalResults.forEach(res => {
      if (!res.studentId) return;
      const studentId = res.studentId;
      if (!studentStats[studentId]) {
        studentStats[studentId] = { id: studentId, name: res.studentUsername || "Student", totalScore: 0, examsTaken: 0 };
      }
      if (res.studentUsername && res.studentUsername !== "Student" && studentStats[studentId].name === "Student") {
        studentStats[studentId].name = res.studentUsername;
      }
      studentStats[studentId].totalScore += (res.score || 0);
      studentStats[studentId].examsTaken += 1;
    });

    const sorted = Object.values(studentStats)
      .map(s => ({ ...s, avgScore: Math.round(s.totalScore / s.examsTaken) }))
      .sort((a, b) => b.avgScore - a.avgScore);

    if (sorted.length > 0) {
      localStorage.setItem('scholar_leaderboard_cache', JSON.stringify(sorted))
    }
    return sorted;
  }, [globalResults, cachedLeaderboard]);

  const standardExams = useMemo(() => {
    if (!exams) return []
    return exams.filter(exam => {
      const isPractice = !!exam.isPractice
      if (isPractice) return false
      const matchesSearch = !searchQuery.trim() ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubject = subjectFilter === "All Subjects" || exam.subject === subjectFilter
      return matchesSearch && matchesSubject
    })
  }, [exams, searchQuery, subjectFilter])

  const practiceExams = useMemo(() => {
    if (!exams) return []
    return exams.filter(exam => {
      const isPractice = !!exam.isPractice
      if (!isPractice) return false
      const matchesSearch = !searchQuery.trim() ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubject = subjectFilter === "All Subjects" || exam.subject === subjectFilter
      return matchesSearch && matchesSubject
    })
  }, [exams, searchQuery, subjectFilter])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newUsername.trim()) return
    setIsUpdatingProfile(true)
    try {
      await setDoc(doc(db, "users", user.uid), { username: newUsername.trim() }, { merge: true })

      const resultsRef = collectionGroup(db, "results")
      const q = query(resultsRef, where("studentId", "==", user.uid))
      const snap = await getDocs(q)
      const batch = writeBatch(db)
      let count = 0;
      snap.forEach(d => {
        batch.update(d.ref, { studentUsername: newUsername.trim() })
        count++;
      })
      if (count > 0) await batch.commit()

      toast({ title: "Profile updated", description: "Your name has been updated across your records." })
      setIsEditingProfile(false)
    } catch (e: any) {
      toast({ title: "Could not update profile", description: e.message, variant: "destructive" })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleReview = async (res: any) => {
    if (!res.correctAnswers) return
    setReviewResult(res)
    setLoadingReview(true)
    try {
      const qSnap = await getDocs(collection(db, `exams/${res.examId}/questions`))
      setReviewQuestions(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (e: any) {
      toast({ title: "Could not load review", description: "Failed to fetch the questions.", variant: "destructive" })
    } finally {
      setLoadingReview(false)
    }
  }

  const filteredReviewQuestions = useMemo(() => {
    if (!reviewResult || !reviewQuestions.length) return [];
    return reviewQuestions.filter(q => {
      if (reviewFilter === "all") return true;
      const isCorrect = reviewResult.responses?.[q.id] === reviewResult.correctAnswers?.[q.id];
      return reviewFilter === "correct" ? isCorrect : !isCorrect;
    });
  }, [reviewResult, reviewQuestions, reviewFilter]);

  if (!mounted || isUserLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }
  if (!user) return null;

  const displayName = userProfile?.username || user.email?.split('@')[0] || "Student";

  const statItems = [
    { label: "Assessments taken", value: stats.totalTaken, icon: History },
    { label: "Average score", value: `${stats.avgScore}%`, icon: Target },
    { label: "Most recent", value: `${stats.latestScore}%`, icon: TrendingUp },
    { label: "Flagged attempts", value: stats.flags, icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 shrink-0 object-contain" />
            <span className="font-semibold text-sm tracking-tight truncate">Assessment</span>
          </div>

          <div className="flex items-center gap-1">
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 max-w-[180px]">
                  <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{displayName}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit your profile</DialogTitle></DialogHeader>
                <form onSubmit={handleUpdateUsername} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full name</Label>
                    <Input
                      id="displayName"
                      value={newUsername || ""}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                    Save changes
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <ModeToggle />

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        <header className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {userRank
                ? <>You're ranked <span className="font-medium text-foreground tabular-nums">#{userRank}</span> by average score.</>
                : "Take an assessment to see how you're tracking."}
            </p>
          </div>

          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {item.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full max-w-2xl grid grid-cols-4">
            <TabsTrigger value="exams" className="gap-2"><BookOpen className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Assessments</span></TabsTrigger>
            <TabsTrigger value="practice" className="gap-2"><Target className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Practice</span></TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">History</span></TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2"><Trophy className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Leaderboard</span></TabsTrigger>
          </TabsList>

          {/* Assessments */}
          <TabsContent value="exams" className="space-y-5">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search assessments"
                className="pl-9"
                aria-label="Search assessments"
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {examsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : standardExams.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Inbox}
                  title={searchQuery ? "No matching assessments" : "No assessments available"}
                  description={searchQuery
                    ? "Try a different search term."
                    : "When your instructor publishes an assessment, it will appear here."}
                />
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {standardExams.map((exam) => (
                  <Card key={exam.id} className="flex flex-col transition-colors hover:border-primary/50">
                    <CardHeader className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{exam.subject}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {exam.timeLimitMinutes} min
                        </span>
                      </div>
                      <CardTitle className="text-base font-semibold">{exam.title}</CardTitle>
                      {exam.description && (
                        <CardDescription className="line-clamp-2">{exam.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto pt-0">
                      <Button onClick={() => router.push(`/exam/${exam.id}`)} className="w-full gap-1.5">
                        Start <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Practice */}
          <TabsContent value="practice" className="space-y-5">
            {examsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : practiceExams.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Target}
                  title="No practice sets yet"
                  description="Practice sets are untimed and marked instantly, so you can check your understanding as you go."
                />
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {practiceExams.map((exam) => (
                  <Card key={exam.id} className="flex flex-col transition-colors hover:border-primary/50">
                    <CardHeader className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{exam.subject}</Badge>
                        <Badge variant="outline">Untimed</Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{exam.title}</CardTitle>
                      {exam.description && (
                        <CardDescription className="line-clamp-2">{exam.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto pt-0">
                      <Button variant="outline" onClick={() => router.push(`/exam/${exam.id}`)} className="w-full gap-1.5">
                        Practice <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                {resultsLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : combinedResults.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="No attempts yet"
                    description="Once you complete an assessment, your score and a question-by-question review will appear here."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {combinedResults.map((res) => {
                      const examData = exams?.find(e => e.id === res.examId);
                      const isGraded = !!res.correctAnswers;
                      const isPassed = isGraded && (res.score || 0) >= (examData?.passingScore || 0);
                      const attemptDate = getSafeDate(res.completedAt || res.startedAt);
                      return (
                        <li key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2 min-w-0">
                            <p className="font-medium text-sm truncate">{res.examTitle}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isGraded ? (
                                <Badge variant={isPassed ? "default" : "destructive"}>
                                  {isPassed ? "Passed" : "Not passed"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Awaiting grading</Badge>
                              )}
                              {res.integrityStatus === 'Flagged' && (
                                <Badge variant="outline" className="text-destructive border-destructive/40">Tab switch recorded</Badge>
                              )}
                              {res.isPractice && <Badge variant="outline">Practice</Badge>}
                              {attemptDate && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {attemptDate.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-2xl font-semibold tabular-nums">
                                {isGraded ? `${res.score || 0}%` : "—"}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleReview(res)}
                              disabled={!isGraded}
                            >
                              {isGraded
                                ? <><Eye className="w-4 h-4" aria-hidden="true" /> Review</>
                                : <><Lock className="w-4 h-4" aria-hidden="true" /> Locked</>}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard">
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Leaderboard</CardTitle>
                  <CardDescription>Ranked by average score across all assessments.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  {globalLoading && leaderboardData.length === 0 ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : leaderboardData.length === 0 ? (
                    <EmptyState
                      icon={Trophy}
                      title="No rankings yet"
                      description="The leaderboard fills in once assessments have been graded."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="text-right">Average</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaderboardData.slice(0, 20).map((s, i) => (
                            <TableRow key={`leader-${s.id}-${i}`} className={cn(s.id === user.uid && "bg-primary/5")}>
                              <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                {s.name}
                                {s.id === user.uid && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{s.avgScore}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Your standing</CardTitle>
                </CardHeader>
                <CardContent>
                  {userRank ? (
                    <div className="space-y-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rank</p>
                          <p className="text-3xl font-semibold tabular-nums">#{userRank}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Average</p>
                          <p className="text-3xl font-semibold tabular-nums">{stats.avgScore}%</p>
                        </div>
                      </div>
                      <Progress value={stats.avgScore} className="h-1.5" aria-label="Your average score" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-6">
                      Your ranking appears once you have a graded result.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Review dialog */}
      <Dialog open={!!reviewResult} onOpenChange={(open) => !open && setReviewResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Review — {reviewResult?.examTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 pt-2">
            {(["all", "correct", "incorrect"] as const).map(f => (
              <Button
                key={f}
                variant={reviewFilter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setReviewFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>

          {loadingReview ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredReviewQuestions.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing to show"
              description={`No ${reviewFilter === "all" ? "" : reviewFilter + " "}questions in this attempt.`}
            />
          ) : (
            <div className="space-y-4 pt-2">
              {filteredReviewQuestions.map((q, idx) => {
                const studentChoice = reviewResult?.responses?.[q.id];
                const correctChoice = reviewResult?.correctAnswers?.[q.id];
                const isCorrect = studentChoice === correctChoice;
                return (
                  <Card key={q.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                      <p className="text-sm font-medium flex-1">{idx + 1}. {q.questionText}</p>
                      <Badge variant={isCorrect ? "default" : "destructive"} className="shrink-0">
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div
                          key={oIdx}
                          className={cn(
                            "p-3 rounded-md border flex justify-between items-center gap-3 text-sm",
                            oIdx === correctChoice
                              ? "border-success/50 bg-success/10"
                              : oIdx === studentChoice
                              ? "border-destructive/50 bg-destructive/10"
                              : "border-border"
                          )}
                        >
                          <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                          {oIdx === correctChoice && <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-label="Correct answer" />}
                          {oIdx === studentChoice && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" aria-label="Your answer" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  )
}
