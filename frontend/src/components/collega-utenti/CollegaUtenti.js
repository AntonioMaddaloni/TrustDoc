"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

export default function OrganizationCreator() {
  const [organizationName, setOrganizationName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState(null) // 'success' or 'error'

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      setMessage("Per favore, inserisci il nome dell'organizzazione.")
      setMessageType("error")
      return
    }

    setIsCreating(true)
    setMessage(null)
    setMessageType(null)

    try {
      const response = await api.post("/organizations", {
        name: organizationName.trim(),
      })

      setMessage(`Organizzazione "${organizationName}" creata con successo!`)
      setMessageType("success")
      setOrganizationName("") // Reset del form
    } catch (error) {
      console.error("Errore nella creazione dell'organizzazione:", error)
      let errorMessage = "Errore durante la creazione dell'organizzazione."

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      setMessage(errorMessage)
      setMessageType("error")
    } finally {
      setIsCreating(false)
    }
  }

  const handleReset = () => {
    setOrganizationName("")
    setMessage(null)
    setMessageType(null)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <Card>
        <CardHeader>
          <CardTitle>Crea Nuova Organizzazione</CardTitle>
          <CardDescription>Inserisci i dettagli per creare una nuova organizzazione nel sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Form per la creazione */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationName" className="text-blue-900 font-medium">
                    Nome Organizzazione
                  </Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Inserisci il nome dell'organizzazione..."
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={isCreating}
                    className="mt-2"
                    maxLength={100}
                  />
                  <p className="text-xs text-blue-600 mt-1">Massimo 100 caratteri</p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={handleCreateOrganization}
                    disabled={isCreating || !organizationName.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCreating ? "Creazione in corso..." : "Conferma Creazione"}
                  </Button>

                  <Button variant="outline" onClick={handleReset} disabled={isCreating}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            {/* Messaggio di stato */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  messageType === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                <p className={`${messageType === "success" ? "text-green-700" : "text-red-700"} font-medium`}>
                  {messageType === "success" ? "✓ " : "⚠ "}
                  {message}
                </p>

                {messageType === "success" && (
                  <Button onClick={handleReset} className="mt-3 bg-green-600 hover:bg-green-700" size="sm">
                    Crea un'altra Organizzazione
                  </Button>
                )}
              </div>
            )}

            {/* Informazioni aggiuntive */}
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-purple-900">Informazioni</h3>
              <div className="text-purple-700 mt-2 space-y-2">
                <p>• Il nome dell'organizzazione deve essere unico nel sistema</p>
                <p>• Una volta creata, potrai gestire membri e permessi</p>
                <p>• L'organizzazione sarà immediatamente disponibile per l'uso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
