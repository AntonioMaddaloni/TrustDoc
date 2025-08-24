"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import DocumentCard from "./DocumentCard";

export default function DocumentList({ user }) {
  // Stati per gestire i documenti e il caricamento
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Funzione per ottenere l'endpoint corretto basato sul ruolo
  const getDocumentsEndpoint = () => {
    switch (user?.role_type) {
      case 0: // Super Admin - tutti i documenti del sistema
        return '/doc/all';
      case 100: // Organization Admin - documenti della sua organizzazione
        return '/doc/organization';
      default: // Independent User - solo i suoi documenti
        return '/doc/my';
    }
  };

  // Funzione per caricare i documenti dal backend
  const fetchDocuments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const endpoint = getDocumentsEndpoint();
      console.log(`Caricamento documenti per ruolo ${user?.role_type} da endpoint: ${endpoint}`);
      
      // Chiamata all'API appropriata basata sul ruolo
      const response = await api.get(endpoint);
      
      console.log("Risposta API:", response.data);
      
      if (response.data.success) {
        setDocuments(response.data.data);
        console.log(`${response.data.data.length} documenti caricati`);
      } else {
        setError(response.data.message || 'Errore nel caricamento documenti');
      }
    } catch (err) {
      console.error('Errore chiamata API:', err);
      
      let errorMessage = 'Errore di connessione';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 401) {
        errorMessage = 'Sessione scaduta, rieffettua il login';
      } else if (err.response?.status === 403) {
        errorMessage = 'Non hai i permessi per visualizzare i documenti';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carica i documenti quando il componente si monta
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Funzione per aggiornare manualmente
  const handleRefresh = () => {
    fetchDocuments(true);
  };

  // Funzione per eliminare un documento (se implementata nel backend)
  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      await api.delete(`/documents/${documentId}`);
      
      // Rimuovi il documento dalla lista locale senza ricaricare tutto
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      
      console.log('Documento eliminato con successo');
    } catch (err) {
      console.error('Errore eliminazione documento:', err);
      alert('Errore nell\'eliminazione del documento: ' + 
            (err.response?.data?.message || err.message));
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>I Miei Documenti</CardTitle>
          <CardDescription>Caricamento documenti in corso...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Caricamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>I Miei Documenti</CardTitle>
          <CardDescription>Si è verificato un errore</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Errore nel caricamento</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>I Miei Documenti</CardTitle>
            <CardDescription>
              {documents.length === 0 
                ? "Non hai ancora caricato documenti" 
                : `Hai ${documents.length} documento${documents.length !== 1 ? 'i' : ''}`
              }
            </CardDescription>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Aggiornamento...
              </>
            ) : (
              'Aggiorna'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          // Stato vuoto personalizzato per ruolo
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user?.role_type === 0 && "Nessun documento nel sistema"}
              {user?.role_type === 100 && "Nessun documento nell'organizzazione"}
              {user?.role_type !== 0 && user?.role_type !== 100 && "Nessun documento"}
            </h3>
            <p className="text-gray-600 mb-4">
              {user?.role_type === 0 && "Non ci sono documenti caricati nel sistema."}
              {user?.role_type === 100 && "Non ci sono documenti caricati nella tua organizzazione."}
              {user?.role_type !== 0 && user?.role_type !== 100 && "Non hai ancora caricato nessun documento. Inizia caricando il tuo primo PDF!"}
            </p>
            {(user?.role_type !== 0 && user?.role_type !== 100) && (
              <Button 
                onClick={() => window.location.href = '/dashboard'} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Vai alla Dashboard per caricare
              </Button>
            )}
          </div>
        ) : (
          // Lista documenti
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <DocumentCard
                key={document._id}
                document={document}
                user={user}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}