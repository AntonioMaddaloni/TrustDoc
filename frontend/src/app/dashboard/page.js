"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { user, logout, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Benvenuto, {user?.name} {user?.surname}
              </span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Benvenuto nella Dashboard</CardTitle>
              <CardDescription>
                Questa è la tua dashboard personale. Al momento è vuota, ma qui potrai gestire tutte le tue attività.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900">Profilo Utente</h3>
                  <p className="text-blue-700 mt-2">
                    <strong>Nome:</strong> {user?.name} {user?.surname}
                  </p>
                  <p className="text-blue-700">
                    <strong>Email:</strong> {user?.email}
                  </p>
                  <p className="text-blue-700">
                    <strong>Ruolo:</strong>{" "}
                    {user?.role_type === 0
                      ? "Super Admin"
                      : user?.role_type === 100
                        ? "Organization Admin"
                        : "Independent User"}
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900">Statistiche</h3>
                  <p className="text-green-700 mt-2">Qui potrai vedere le tue statistiche</p>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-900">Attività Recenti</h3>
                  <p className="text-purple-700 mt-2">Le tue attività recenti appariranno qui</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
