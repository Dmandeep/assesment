"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

export function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()

  // Reset password visibility when switching between sign in and sign up
  useEffect(() => {
    setShowPassword(false)
  }, [isSignUp])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        if (!username) {
          toast({ title: "Enter a name", description: "Please enter your name to continue.", variant: "destructive" })
          setLoading(false)
          return
        }

        if (password !== confirmPassword) {
          toast({ title: "Passwords don't match", description: "Please re-enter your password.", variant: "destructive" })
          setLoading(false)
          return
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // All public signups default to student.
        const finalizedRole = 'student'

        // Create the base user profile with username
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          email: user.email,
          username: username,
          role: finalizedRole,
          createdAt: serverTimestamp()
        })

        toast({ title: "Account created", description: `Welcome, ${username}.` })
        router.push(`/dashboard/${finalizedRole}`)
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Fetch user document to find their actual role for redirection
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          router.push(`/dashboard/${userData.role}`)
        } else {
          // Fallback if profile doesn't exist yet
          router.push(`/dashboard/student`)
        }
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Could not create account" : "Could not sign in",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Enter your email first",
        description: "We'll send the reset link to that address.",
        variant: "destructive"
      })
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "Reset email sent",
        description: "Check your inbox for instructions to reset your password.",
      })
    } catch (error: any) {
      toast({
        title: "Could not send reset email",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {isSignUp ? "Create your account" : "Sign in"}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? "Students can register here. Staff accounts are created by an administrator."
            : "Enter your email and password to continue."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="username">Full name</Label>
              <Input
                id="username"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs font-normal"
                  onClick={handleForgotPassword}
                  type="button"
                >
                  Forgot password?
                </Button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "At least 6 characters" : ""}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {loading ? "Please wait" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Button
            variant="link"
            size="sm"
            onClick={() => { setIsSignUp(!isSignUp); setConfirmPassword(""); }}
            className="h-auto p-0 text-sm"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Button>
        </p>
      </CardFooter>
    </Card>
  )
}
