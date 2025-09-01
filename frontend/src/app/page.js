"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log(user)
        switch (user.role) {
            case 0: // Super Admin
              return router.push("/crea-organizzazione")
            case 100: // Organization Admin
              return router.push("/dashboard")
            default: // Independent User e altri casi
              return router.push("/dashboard")
          }
        
      } else {
        router.push("/login")
      }
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return null
}