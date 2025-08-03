"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState("") // Rinominato per evitare conflitto con context.error
  const [loading, setLoading] = useState(false)

  //console.log("LoginPage: Component rendering.")

  const auth = useAuth() // Ottieni l'intero oggetto del context
  //console.log("LoginPage: useAuth result:", auth)

  // Destruttura le proprietà dal context
  const { login, isAuthenticated, error: authContextError } = auth
  const router = useRouter()

  // Unifica gli errori
  useEffect(() => {
    if (authContextError) {
      setFormError(authContextError)
    }
  }, [authContextError])

  // Redirect se già autenticato
  useEffect(() => {
    if (isAuthenticated) {
      console.log("LoginPage: User is authenticated, redirecting to dashboard.")
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("") // Resetta l'errore del form
    setLoading(true)

    console.log("LoginPage: Form submitted. Attempting login...")
    console.log("LoginPage: Type of login function:", typeof login)

    // Verifica esplicita che login sia una funzione
    if (!login || typeof login !== "function") {
      console.error("LoginPage: Login function is not available or not a function!")
      setFormError("Errore interno: la funzione di login non è disponibile.")
      setLoading(false)
      return
    }

    try {
      const result = await login(email, password)
      console.log("LoginPage: Login attempt result:", result)

      if (!result.success) {
        setFormError(result.error || "Credenziali non valide.")
      }
    } catch (err) {
      console.error("LoginPage: Error during login submission:", err)
      setFormError("Si è verificato un errore inaspettato durante il login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Accedi</CardTitle>
          <CardDescription className="text-center">
            Inserisci le tue credenziali per accedere al tuo account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {(formError || authContextError) && ( // Mostra errori dal form o dal context
              <Alert variant="destructive">
                <AlertDescription>{formError || authContextError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="mario.rossi@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading || !login}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Non hai un account?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Registrati
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
