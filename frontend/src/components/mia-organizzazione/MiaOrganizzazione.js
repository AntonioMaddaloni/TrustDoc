"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

export default function MiaOrganizzazionePage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersRes = await api.get("/api/my-organization/users")

      // Handle different response structures
      const usersData = usersRes.data?.data || usersRes.data || []
      setUsers(usersData)
      setMessage("")
    } catch (error) {
      console.error("Errore caricamento:", error)
      setMessage("Errore nel caricamento degli utenti")
    } finally {
      setLoading(false)
    }
  }

  const viewUserDetails = (userId) => {
    router.push(`/utente/${userId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Caricamento...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>La Mia Organizzazione - Utenti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="p-3 rounded-md bg-red-100 text-red-800 border border-red-200">{message}</div>}

          {users.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Nessun utente trovato nella tua organizzazione</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const userId = user.id || user._id
                return (
                  <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {user.name} {user.surname}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.role && <div className="text-xs text-blue-600 mt-1">{user.role}</div>}
                    </div>

                    <Button onClick={() => viewUserDetails(userId)} variant="outline" size="sm">
                      Visualizza
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
