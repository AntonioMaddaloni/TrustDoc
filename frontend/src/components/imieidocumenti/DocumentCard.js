"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DocumentCard({ document, user, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Verifica se l'utente corrente può eliminare questo documento
  const canDeleteDocument = () => {
    if (user?.role_type === 0) return true; // Super Admin può eliminare tutto
    if (user?.role_type === 100) {
      // Organization Admin può eliminare documenti della sua organizzazione
      return document.organizationId === user.organizationId;
    }
    // Independent User può eliminare solo i suoi documenti
    return document.userId === user._id;
  };

  // Verifica se mostrare informazioni sul proprietario (per Admin)
  const shouldShowOwnerInfo = () => {
    return user?.role_type === 0 || user?.role_type === 100;
  };

  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return "Data non disponibile";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data non valida";
    
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Funzione per formattare la dimensione del file
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "Dimensione sconosciuta";
    
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  // Funzione per ottenere l'icona del tipo file
  const getFileTypeIcon = (fileName) => {
    if (!fileName) return "📄";
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return "📄";
      case 'doc':
      case 'docx':
        return "📝";
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return "🖼️";
      default:
        return "📄";
    }
  };

  // Gestisce l'eliminazione del documento
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(document._id);
    } catch (error) {
      console.error("Errore eliminazione:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Funzione per scaricare il documento (se implementata nel backend)
  const handleDownload = () => {
    // Assumendo che il backend abbia un endpoint per il download
    window.open(`/api/documents/download/${document._id}`, '_blank');
  };


  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileTypeIcon(document.fileName)}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium text-gray-900 truncate">
                {document.fileName || document.originalFileName || document.title ||"Documento senza nome"}
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
          {/* Informazioni proprietario (solo per Admin) */}
          {shouldShowOwnerInfo() && document.user && (
            <div className="flex justify-between border-b pb-2 mb-3">
              <span>Proprietario:</span>
              <span className="font-medium text-blue-600">
                {document.user.name} {document.user.surname}
              </span>
            </div>
          )}
          
          {/* Data di caricamento */}
          <div className="flex justify-between">
            <span>Caricato:</span>
            <span className="font-medium">
              {formatDate(document.create_at || document.updated_at)}
            </span>
          </div>
          
          {/* Dimensione file */}
          {document.fileSize && (
            <div className="flex justify-between">
              <span>Dimensione:</span>
              <span className="font-medium">{formatFileSize(document.fileSize)}</span>
            </div>
          )}
          
          {/* Tipo documento */}
          {document.type && (
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-medium capitalize">{document.type}</span>
            </div>
          )}
          
          {/* Stato firma */}
          {document.signatureMetadata && (
            <div className="flex justify-between">
              <span>Firmato il:</span>
              <span className="font-medium">
                {formatDate(document.signatureMetadata.timestamp)}
              </span>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleDownload}
              className="text-green-600 hover:text-green-700"
            >
              Scarica
            </Button>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting || !canDeleteDocument()}
            className={`${canDeleteDocument() 
              ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
              : 'text-gray-400 cursor-not-allowed'
            }`}
            title={!canDeleteDocument() ? 'Non hai i permessi per eliminare questo documento' : 'Elimina documento'}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                Eliminando...
              </>
            ) : (
              'Elimina'
            )}
          </Button>
        </div>
        
        {/* Debug info (rimuovi in produzione) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3 text-xs text-gray-400">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {JSON.stringify(document, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}