"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

function PdfSigner() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [pdfEditorVisible, setPdfEditorVisible] = useState(false)
  const [signatureData, setSignatureData] = useState(null)
  const [signatureCoordinates, setSignatureCoordinates] = useState(null)
  const [pdfDataUrl, setPdfDataUrl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Stati per la firma
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureMode, setSignatureMode] = useState(false)
  const [signatureBounds, setSignatureBounds] = useState({ 
    minX: Infinity, 
    minY: Infinity, 
    maxX: -Infinity, 
    maxY: -Infinity 
  })
  
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const router = useRouter()

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
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
      setPdfEditorVisible(true)
    } else {
      alert("Nessun file PDF selezionato.")
    }
  }

  // Setup canvas quando l'editor diventa visibile
  useEffect(() => {
    if (pdfEditorVisible && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current
      const container = containerRef.current
      
      const resizeCanvas = () => {
        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight
        canvas.style.width = container.offsetWidth + 'px'
        canvas.style.height = container.offsetHeight + 'px'
        
        // Configura il canvas per la firma
        const ctx = canvas.getContext('2d')
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
      
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      
      return () => {
        window.removeEventListener('resize', resizeCanvas)
      }
    }
  }, [pdfEditorVisible])

  const updateBounds = (x, y) => {
    setSignatureBounds(prev => ({
      minX: Math.min(prev.minX, x),
      minY: Math.min(prev.minY, y),
      maxX: Math.max(prev.maxX, x),
      maxY: Math.max(prev.maxY, y)
    }))
  }

  const startDrawing = (e) => {
    if (!signatureMode) return
    
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    updateBounds(x, y)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing || !signatureMode) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    updateBounds(x, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    
    // Salva i dati della firma e le coordinate
    if (signatureBounds.minX !== Infinity) {
      const signatureDataUrl = canvas.toDataURL('image/png')
      setSignatureData(signatureDataUrl)
      
      const coordinates = {
        x: signatureBounds.minX,
        y: signatureBounds.minY,
        width: signatureBounds.maxX - signatureBounds.minX,
        height: signatureBounds.maxY - signatureBounds.minY,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        // Coordinate relative per la scalatura
        relativeX: signatureBounds.minX / canvas.width,
        relativeY: signatureBounds.minY / canvas.height,
        relativeWidth: (signatureBounds.maxX - signatureBounds.minX) / canvas.width,
        relativeHeight: (signatureBounds.maxY - signatureBounds.minY) / canvas.height
      }
      setSignatureCoordinates(coordinates)
    }
  }

  const toggleSignatureMode = () => {
    setSignatureMode(!signatureMode)
  }

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData(null)
      setSignatureCoordinates(null)
      setSignatureBounds({ 
        minX: Infinity, 
        minY: Infinity, 
        maxX: -Infinity, 
        maxY: -Infinity 
      })
    }
  }

  // Funzione per creare PDF firmato nel frontend usando pdf-lib
  const createSignedPdf = async () => {
    try {
      // Prova a importare pdf-lib dinamicamente
      let PDFLib
      try {
        PDFLib = await import('pdf-lib')
      } catch (importError) {
        console.warn("pdf-lib non disponibile, usando metodo fallback")
        throw new Error("PDF_LIB_NOT_AVAILABLE")
      }
      
      const { PDFDocument } = PDFLib
      
      // Leggi il file PDF originale
      const pdfBytes = await selectedFile.arrayBuffer()
      const pdfDoc = await PDFDocument.load(pdfBytes)
      
      // Ottieni la prima pagina (puoi estendere per più pagine)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width: pageWidth, height: pageHeight } = firstPage.getSize()
      
      // Converti l'immagine della firma in formato utilizzabile
      const signatureImageBytes = await fetch(signatureData).then(res => res.arrayBuffer())
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
      
      // Calcola la posizione e dimensioni della firma sul PDF
      const scaleX = pageWidth / signatureCoordinates.canvasWidth
      const scaleY = pageHeight / signatureCoordinates.canvasHeight
      
      const signatureWidth = signatureCoordinates.width * scaleX
      const signatureHeight = signatureCoordinates.height * scaleY
      const signatureX = signatureCoordinates.x * scaleX
      // In PDF le coordinate Y partono dal basso, quindi invertiamo
      const signatureY = pageHeight - (signatureCoordinates.y * scaleY) - signatureHeight
      
      // Aggiungi la firma al PDF
      firstPage.drawImage(signatureImage, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
        opacity: 1.0,
      })
      
      // Serializza il PDF firmato
      const signedPdfBytes = await pdfDoc.save()
      
      // Crea un Blob del PDF firmato
      const signedPdfBlob = new Blob([signedPdfBytes], { type: 'application/pdf' })
      
      return signedPdfBlob
      
    } catch (error) {
      if (error.message === "PDF_LIB_NOT_AVAILABLE") {
        console.log("Fallback: invio PDF e firma separati al backend")
        // Ritorna null per attivare il fallback
        return null
      }
      console.error('Errore nella creazione del PDF firmato:', error)
      throw new Error('Impossibile creare il PDF firmato: ' + error.message)
    }
  }

  const handleClearSignature = () => {
    console.log("Cancella firma e resetta editor")
    setSignatureData(null)
    setSignatureCoordinates(null)
    setPdfEditorVisible(false)
    setSelectedFile(null)
    setPdfDataUrl(null)
    setIsUploading(false)
    setSignatureMode(false)
    setIsDrawing(false)
    setSignatureBounds({ 
      minX: Infinity, 
      minY: Infinity, 
      maxX: -Infinity, 
      maxY: -Infinity 
    })
  }

  const handleConfirmSignature = async () => {
    console.log("Conferma firma e avvia processi")
    
    if (!selectedFile) {
      alert("Nessun file selezionato.")
      return
    }

    if (!signatureData || !signatureCoordinates) {
      alert("Per favore, aggiungi la tua firma prima di confermare.")
      return
    }

    setIsUploading(true)
    
    try {
      console.log("Creazione del PDF firmato nel frontend...")
      
      // Prova a creare il PDF firmato utilizzando pdf-lib
      const signedPdfBlob = await createSignedPdf()
      
      let formData = new FormData()
      
      if (signedPdfBlob) {
        // Caso 1: PDF firmato creato con successo nel frontend
        console.log("PDF firmato creato:", {
          size: signedPdfBlob.size,
          type: signedPdfBlob.type
        })
        
        formData.append("pdf", signedPdfBlob, `${selectedFile.name.replace('.pdf', '')}_firmato.pdf`)
        formData.append("fileName", `${selectedFile.name.replace('.pdf', '')}_firmato.pdf`)
        formData.append("fileSize", signedPdfBlob.size.toString())
        formData.append("isPreSigned", "true")
        
      } else {
        // Caso 2: Fallback - invia PDF originale + firma per elaborazione backend
        console.log("Fallback: invio PDF e firma separati al backend")
        
        formData.append("pdf", selectedFile)
        formData.append("signature", signatureData)
        formData.append("fileName", selectedFile.name)
        formData.append("fileSize", selectedFile.size.toString())
        formData.append("canvasWidth", signatureCoordinates.canvasWidth.toString())
        formData.append("canvasHeight", signatureCoordinates.canvasHeight.toString())
        formData.append("isPreSigned", "false")
      }
      
      // Metadati comuni
      const signatureMetadata = {
        originalFileName: selectedFile.name,
        coordinates: signatureCoordinates,
        timestamp: new Date().toISOString(),
        signatureFormat: 'png',
        hasSingnature: true
      }
      
      formData.append("signatureMetadata", JSON.stringify(signatureMetadata))

      // Debug: mostra cosa stiamo inviando
      console.log("FormData contents:")
      for (let [key, value] of formData.entries()) {
        if (value instanceof File || value instanceof Blob) {
          console.log(key, ":", value.constructor.name, "size:", value.size, "type:", value.type)
        } else {
          console.log(key, ":", value)
        }
      }

      console.log("Invio del PDF firmato al backend...")

      // Effettua la chiamata API
      const response = await api.post("/doc/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percentCompleted}%`)
        },
      })

      console.log("Upload successful:", response.data)
      alert(`PDF firmato caricato con successo!`)
      
      // Resetta l'editor dopo il successo
      handleClearSignature()
      
    } catch (error) {
      console.error("Errore completo durante l'upload:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)
      
      let errorMessage = "Errore durante l'upload del file"
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.message.includes('pdf-lib')) {
        errorMessage = "Errore nella creazione del PDF firmato. Assicurati che pdf-lib sia installato."
      }
      
      alert(`Errore (${error.response?.status || 'Sconosciuto'}): ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Carica e Firma Documento PDF</CardTitle>
        <CardDescription>
          Carica un documento PDF, apponi la tua firma digitale e caricalo in modo del tutto Sicuro!. 
          <br />
          <small className="text-xs text-orange-600">
          </small>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!pdfEditorVisible ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mb-4 p-2 border rounded-md"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="mb-2 text-gray-700">
                File selezionato: <strong>{selectedFile.name}</strong>
              </p>
            )}
            <Button onClick={handleUploadClick} disabled={!selectedFile || isUploading}>
              Carica PDF
            </Button>
            <p className="text-sm text-gray-500 mt-2">Formato: PDF | Dimensioni massime: 10MB</p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Editor PDF con Firma</h3>
              <div className="flex space-x-2">
                <Button
                  variant={signatureMode ? "default" : "outline"}
                  onClick={toggleSignatureMode}
                  disabled={isUploading}
                  size="sm"
                  className={signatureMode ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {signatureMode ? "Esci dalla Firma" : "Modalità Firma"}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSignatureCanvas}
                  disabled={isUploading || !signatureData}
                  size="sm"
                >
                  Cancella Firma
                </Button>
              </div>
            </div>
            
            {signatureMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm">
                  <strong>Modalità Firma Attiva:</strong> Clicca e trascina sul documento per disegnare la tua firma.
                  {signatureData && (
                    <span className="ml-2 text-green-600 font-medium">✓ Firma apposta</span>
                  )}
                </p>
              </div>
            )}
            
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
              <div 
                ref={containerRef}
                className="relative" 
                style={{ height: "600px" }}
              >
                {pdfDataUrl ? (
                  <>
                    <iframe 
                      src={pdfDataUrl} 
                      className="w-full h-full" 
                      title="PDF Viewer" 
                      style={{ 
                        border: "none",
                        pointerEvents: signatureMode ? 'none' : 'auto'
                      }} 
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 z-10"
                      style={{ 
                        pointerEvents: signatureMode ? 'auto' : 'none',
                        cursor: signatureMode ? 'crosshair' : 'default',
                        backgroundColor: 'transparent'
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Caricamento PDF...</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                {signatureMode && !signatureData && (
                  <p>💡 Clicca e trascina per disegnare la tua firma sul documento</p>
                )}
                {signatureData && signatureCoordinates && (
                  <div>
                    <p className="text-green-600">✓ Firma apposta correttamente</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Posizione: ({Math.round(signatureCoordinates.x)}, {Math.round(signatureCoordinates.y)}) - 
                      Dimensioni: {Math.round(signatureCoordinates.width)}x{Math.round(signatureCoordinates.height)}px
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      🎯 Il PDF firmato sarà generato nel browser e caricato in modo sicuro.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleClearSignature} 
                  disabled={isUploading}
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleConfirmSignature} 
                  disabled={isUploading || !signatureData}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? "Creazione PDF e caricamento..." : "Firma e Carica"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function IndependentUserDashboard({ user }) {
  const router = useRouter()
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
              <Button 
                className="mt-4 bg-green-600 hover:bg-green-700" 
                onClick={() => router.push('/i-miei-documenti')}
              >
                Vai ai Documenti
          </Button>
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