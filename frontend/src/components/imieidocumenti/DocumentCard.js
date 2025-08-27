"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import api from "@/lib/api";

export default function DocumentCard({ document: doc, user, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Verifica se l'utente corrente può eliminare questo documento
  const canDeleteDocument = () => {
    if (user?.role_type === 0) return true; // Super Admin può eliminare tutto
    if (user?.role_type === 100) {
      return doc.organizationId === user.organizationId;
    }
    return doc.userId === user._id;
  };

  // Verifica se l'utente può scaricare il documento
  const canDownloadDocument = () => {
    return doc.owner_id === user._id || doc.userId === user._id;
  };

  // Verifica se mostrare informazioni sul proprietario (per Admin)
  const shouldShowOwnerInfo = () => {
    return user?.role_type === 0 || user?.role_type === 100;
  };

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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "Dimensione sconosciuta";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileTypeIcon = (fileName) => {
    if (!fileName) return "📄";
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "🖼️";
      default:
        return "📄";
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(doc._id);
    } catch (error) {
      console.error("Errore eliminazione:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!canDownloadDocument()) {
      alert("Non hai i permessi per scaricare questo documento");
      return;
    }

    setIsDownloading(true);

    try {
      const response = await api.get(`/doc/download/${doc._id}`, {
        responseType: "blob",
        timeout: 60000,
      });

      const blob = new Blob([response.data], { type: "application/pdf" });

      let fileName = doc.filename || doc.fileName || "documento.pdf";

      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (fileNameMatch) {
          fileName = fileNameMatch[1].replace(/['"]/g, "");
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Errore durante il download:", error);
      alert("❌ Errore durante il download del documento");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileTypeIcon(doc.fileName)}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium text-gray-900 truncate">
                {doc.fileName ||
                  doc.originalFileName ||
                  doc.title ||
                  "Documento senza nome"}
              </CardTitle>
              {doc.signatureMetadata?.hasSingnature && (
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
          {shouldShowOwnerInfo() && doc.user && (
            <div className="flex justify-between border-b pb-2 mb-3">
              <span>Proprietario:</span>
              <span className="font-medium text-blue-600">
                {doc.user.name} {doc.user.surname}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Caricato:</span>
            <span className="font-medium">
              {formatDate(doc.create_at || doc.updated_at)}
            </span>
          </div>

          {doc.fileSize && (
            <div className="flex justify-between">
              <span>Dimensione:</span>
              <span className="font-medium">{formatFileSize(doc.fileSize)}</span>
            </div>
          )}

          {doc.type && (
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-medium capitalize">{doc.type}</span>
            </div>
          )}

          {doc.signatureMetadata && (
            <div className="flex justify-between">
              <span>Firmato il:</span>
              <span className="font-medium">
                {formatDate(doc.signatureMetadata.timestamp)}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading || !canDownloadDocument()}
              className={`${
                canDownloadDocument()
                  ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              title={
                !canDownloadDocument()
                  ? "Solo il proprietario può scaricare il documento"
                  : "Scarica documento"
              }
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

          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting || !canDeleteDocument()}
            className={`${
              canDeleteDocument()
                ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                : "text-gray-400 cursor-not-allowed"
            }`}
            title={
              !canDeleteDocument()
                ? "Non hai i permessi per eliminare questo documento"
                : "Elimina documento"
            }
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                Eliminando...
              </>
            ) : (
              "Elimina"
            )}
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-3 text-xs text-gray-400">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
