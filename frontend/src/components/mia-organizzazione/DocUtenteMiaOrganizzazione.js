"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

export default function UserDocumentsPage({ params }) {
  const [documents, setDocuments] = useState([])
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [downloadingId, setDownloadingId] = useState(null)
  const router = useRouter()
  const userId = params.userId

  useEffect(() => {
    loadUserDocuments()
  }, [userId])

  const loadUserDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/doc/myorganization/${userId}`)

      const responseData = response.data?.data || response.data || []
      setDocuments(responseData)

      if (responseData.length > 0 && responseData[0].user) {
        setUserInfo(responseData[0].user)
      }

      setMessage("")
    } catch (error) {
      console.error("Errore caricamento documenti:", error)
      setMessage("Errore nel caricamento dei documenti")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Data non disponibile"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Data non valida"
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "Dimensione sconosciuta"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const getFileTypeIcon = (fileName) => {
    if (!fileName) return "📄"
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "pdf":
        return "📄"
      case "doc":
      case "docx":
        return "📝"
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "🖼️"
      default:
        return "📄"
    }
  }

  const handleDownload = async (document) => {
    const docId = document.id || document._id
    setDownloadingId(docId)

    try {
      const response = await api.get(`/doc/download/${docId}`, {
        responseType: "blob",
        timeout: 60000,
      })

      const blob = new Blob([response.data], { type: "application/pdf" })
      let fileName = document.filename || document.fileName || "documento.pdf"

      const contentDisposition = response.headers["content-disposition"]
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1].replace(/['"]/g, "")
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob)
      const link = window.document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Errore download:", error)
      setMessage("Errore durante il download del documento")
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Caricamento documenti...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documenti di {userInfo ? `${userInfo.name} ${userInfo.surname}` : "Utente"} - {params.userId} </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {documents.length === 0
                  ? "Nessun documento trovato"
                  : `${documents.length} ${documents.length === 1 ? "documento" : "documenti"}`}
              </p>
            </div>
            <Button onClick={() => router.back()} variant="outline" size="sm">
              Torna Indietro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="p-3 rounded-md bg-red-100 text-red-800 border border-red-200">{message}</div>}

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun documento</h3>
              <p className="text-gray-600">Questo utente non ha ancora caricato documenti.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => {
                const docId = document.id || document._id
                const isDownloading = downloadingId === docId

                return (
                  <Card key={docId} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getFileTypeIcon(document.fileName)}</span>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-medium text-gray-900 truncate">
                              {document.fileName ||
                                document.originalFileName ||
                                document.title ||
                                "Documento senza nome"}
                            </CardTitle>
                            {document.signatureMetadata?.hasSingnature && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                ✓ Firmato
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Caricato:</span>
                          <span className="font-medium">{formatDate(document.create_at || document.updated_at)}</span>
                        </div>

                        {document.fileSize && (
                          <div className="flex justify-between">
                            <span>Dimensione:</span>
                            <span className="font-medium">{formatFileSize(document.fileSize)}</span>
                          </div>
                        )}

                        {document.type && (
                          <div className="flex justify-between">
                            <span>Tipo:</span>
                            <span className="font-medium capitalize">{document.type}</span>
                          </div>
                        )}

                        {document.signatureMetadata && (
                          <div className="flex justify-between">
                            <span>Firmato il:</span>
                            <span className="font-medium">{formatDate(document.signatureMetadata.timestamp)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-center mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(document)}
                          disabled={isDownloading}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {isDownloading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                              Scaricando...
                            </>
                          ) : (
                            "Scarica"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
