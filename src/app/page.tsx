"use client"

import { AuthForm } from "@/components/auth/AuthForm"
import { useUser, useDoc, useFirestore, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, GraduationCap, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { useMemoFirebase } from "@/firebase"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  const { data: userProfile, isLoading: profileLoading } = useDoc(userDocRef)

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-semibold text-base tracking-tight">Assessment</span>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-5xl grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-5 max-w-lg">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              Campus recruitment training, measured properly.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Timed multiple-choice assessments across aptitude, reasoning and verbal
              ability — with topic-level results that show each student where to focus
              next.
            </p>
            <dl className="grid grid-cols-3 gap-6 pt-4 border-t border-border">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Format</dt>
                <dd className="mt-1 text-sm font-medium">Timed MCQ</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Feedback</dt>
                <dd className="mt-1 text-sm font-medium">Per topic</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Review</dt>
                <dd className="mt-1 text-sm font-medium">Every question</dd>
              </div>
            </dl>
          </div>

          <div className="flex justify-center lg:justify-end">
            {isUserLoading ? (
              <div className="w-full max-w-md flex items-center justify-center py-24">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="sr-only">Loading</span>
              </div>
            ) : user ? (
              <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm space-y-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Welcome back{profileLoading ? "" : `, ${userProfile?.username || "there"}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">You're already signed in.</p>
                </div>
                <div className="space-y-2.5">
                  <Button
                    onClick={() => router.push(`/dashboard/${userProfile?.role || 'student'}`)}
                    className="w-full gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Go to dashboard
                  </Button>
                  <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
                    <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <AuthForm />
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Assessment — campus recruitment training</p>
        </div>
      </footer>
    </div>
  )
}
