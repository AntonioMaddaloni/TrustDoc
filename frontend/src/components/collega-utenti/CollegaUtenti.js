"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"

export default function CollegaUtentiPage() {
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRes, orgsRes] = await Promise.all([api.get("/admin/users"), api.get("/admin/organizations")])

      // Handle different response structures
      const usersData = usersRes.data?.data || usersRes.data || []
      const orgsData = orgsRes.data?.data || orgsRes.data || []

      setUsers(usersData)
      setOrganizations(orgsData)

      // Initialize assignments with consistent user ID handling
      const initialAssignments = {}
      usersData.forEach((user) => {
        const userId = user.id || user._id
        initialAssignments[userId] = user.organization_id || ""
      })
      setAssignments(initialAssignments)

      setMessage("")
    } catch (error) {
      console.error("Errore caricamento:", error)
      setMessage("Errore nel caricamento dei dati")
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentChange = (userId, organization_id) => {
    setAssignments((prev) => ({
      ...prev,
      [userId]: organization_id,
    }))
  }

  const saveAssignments = async () => {
    try {
      setSaving(true)
      setMessage("")

      await api.put("/admin/user-assignments", { assignments })

      setMessage("Assegnazioni salvate con successo!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Errore nel salvare le assegnazioni")
    } finally {
      setSaving(false)
    }
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
          <CardTitle>Collega Utenti alle Organizzazioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded-md ${
                message.includes("successo")
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="space-y-3">
            {users.map((user) => {
              const userId = user.id || user._id
              return (
                <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {user.name} {user.surname} - {userId}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>

                  <select
                    value={assignments[userId] || ""}
                    onChange={(e) => handleAssignmentChange(userId, e.target.value)}
                    className="border rounded-md px-3 py-2 min-w-[200px]"
                  >
                    <option value="">Nessuna organizzazione</option>
                    {organizations.map((org) => {
                      const orgId = org.id || org._id
                      return (
                        <option key={orgId} value={orgId}>
                          {org.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )
            })}
          </div>

          <div className="pt-4">
            <Button onClick={saveAssignments} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salva Assegnazioni"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
