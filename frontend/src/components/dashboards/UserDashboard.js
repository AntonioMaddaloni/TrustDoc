"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

// Componente Placeholder per il gestore PDF (spostato qui per modularità)
function PdfSigner() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [pdfEditorVisible, setPdfEditorVisible] = useState(false)
  const [signatureData, setSignatureData] = useState(null) // Per memorizzare i dati della firma
  const [pdfDataUrl, setPdfDataUrl] = useState(null) // Per memorizzare l'URL del PDF
  const [isUploading, setIsUploading] = useState(false) // AGGIUNTO: Stato per il caricamento
  const router = useRouter()

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
      // Converti il file in data URL per la visualizzazione
      const reader = new FileReader()
      reader.onload = (e) => {
        setPdfDataUrl(e.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      setSelectedFile(null)
      setPdfDataUrl(null)
      alert("Per favore, seleziona un file PDF.")
    }
  }

  const handleUploadClick = () => {
    if (selectedFile) {
      console.log("File selezionato per l'upload:", selectedFile.name)
      setPdfEditorVisible(true) // Mostra l'editor dopo il caricamento (simulato)
    } else {
      alert("Nessun file PDF selezionato.")
    }
  }

  const handleClearSignature = () => {
    console.log("Cancella firma e resetta editor")
    // Resetta tutti gli stati invece di fare redirect
    setSignatureData(null)
    setPdfEditorVisible(false)
    setSelectedFile(null)
    setPdfDataUrl(null)
    setIsUploading(false) // AGGIUNTO: Reset dello stato di caricamento
  }

  const handleConfirmSignature = async () => {
    console.log("Conferma firma e avvia processi")

    if (!selectedFile) {
      alert("Nessun file selezionato.")
      return
    }

    // Simula la presenza di una firma (puoi modificare questa logica)
    if (!signatureData) {
      // Per ora procediamo comunque, ma potresti voler controllare se c'è effettivamente una firma
      console.log("Procedendo senza firma specifica...")
    }

    setIsUploading(true)

    try {
      // Crea FormData per inviare il file
      const formData = new FormData()
      formData.append("pdf", selectedFile)

      // Aggiungi altri dati se necessario
      if (signatureData) {
        formData.append("signatureData", JSON.stringify(signatureData))
      }

      // Aggiungi metadati del file
      formData.append("fileName", selectedFile.name)
      formData.append("fileSize", selectedFile.size.toString())

      // Effettua la chiamata API - sostituisci con la tua rotta
      const response = await api.post("/doc/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // Opzionale: mostra il progresso dell'upload
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percentCompleted}%`)
        },
      })

      console.log("Upload successful:", response.data)
      alert("Firma confermata! Documento caricato con successo.")

      // Resetta l'editor dopo il successo
      handleClearSignature()
    } catch (error) {
      console.error("Errore durante l'upload:", error)

      if (error.response) {
        // Il server ha risposto con un codice di errore
        alert(`Errore del server: ${error.response.data.message || "Errore sconosciuto"}`)
      } else if (error.request) {
        // La richiesta è stata fatta ma non c'è stata risposta
        alert("Errore di connessione. Controlla la tua connessione internet.")
      } else {
        // Qualcos'altro ha causato l'errore
        alert("Errore durante l'upload del file.")
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Carica e Firma Documento PDF</CardTitle>
        <CardDescription>Carica un documento PDF per visualizzarlo e apporre la tua firma digitale.</CardDescription>
      </CardHeader>
      <CardContent>
        {!pdfEditorVisible ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mb-4 p-2 border rounded-md"
              disabled={isUploading} // AGGIUNTO: Disabilita durante il caricamento
            />
            {selectedFile && (
              <p className="mb-2 text-gray-700">
                File selezionato: <strong>{selectedFile.name}</strong>
              </p>
            )}
            <Button onClick={handleUploadClick} disabled={!selectedFile || isUploading}>
              Carica PDF
            </Button>
            <p className="text-sm text-gray-500 mt-2">Formato: PDF | Dimensioni: [Da definire]</p>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editor PDF</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
              <div className="relative" style={{ height: "600px" }}>
                {pdfDataUrl ? (
                  <iframe src={pdfDataUrl} className="w-full h-full" title="PDF Viewer" style={{ border: "none" }} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Caricamento PDF...</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="outline" onClick={handleClearSignature} disabled={isUploading}>
                Cancella
              </Button>
              <Button onClick={handleConfirmSignature} disabled={isUploading}>
                {isUploading ? "Caricamento..." : "Conferma Firma"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function IndependentUserDashboard({ user }) {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto nella tua Dashboard Personale</CardTitle>
          <CardDescription>Qui puoi visualizzare il tuo profilo e gestire i tuoi documenti.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900">Il Mio Profilo</h3>
              <p className="text-blue-700 mt-2">
                <strong>Nome:</strong> {user?.name} {user?.surname}
              </p>
              <p className="text-blue-700">
                <strong>Email:</strong> {user?.email}
              </p>
              <p className="text-blue-700">
                <strong>Ruolo:</strong> Independent User
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-green-900">I Miei Documenti</h3>
              <p className="text-green-700 mt-2">Qui potrai trovare tutti i documenti che hai caricato o firmato.</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-purple-900">Notifiche Recenti</h3>
              <p className="text-purple-700 mt-2">Le tue notifiche e avvisi recenti appariranno qui.</p>
            </div>
          </div>
          <PdfSigner />
        </CardContent>
      </Card>
    </div>
  )
}
