"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppNavbar from "@/components/navbar/AppNavbar";
import { DocumentList } from "@/components/imieidocumenti";

export default function MyDocumentsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // O un messaggio di reindirizzamento
  }

  // Logica di routing basata sul ruolo dell'utente (come in dashboard)
  const renderDocuments = () => {
    if (!user) {
      return null; // O un fallback se l'oggetto user non è ancora disponibile
    }

    switch (user.role_type) {
      case 0: // Super Admin
        // return <SuperAdminDocuments user={user} />;
        return <p>Gestione Documenti Super Admin in sviluppo...</p>; // Placeholder
      case 100: // Organization Admin
        // return <OrganizationAdminDocuments user={user} />;
        return <p>Gestione Documenti Organization Admin in sviluppo...</p>; // Placeholder
      default: // Independent User (o qualsiasi altro ruolo non specificato)
        return <DocumentList user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header della pagina */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">I Miei Documenti</h1>
            <p className="mt-2 text-gray-600">
              Gestisci tutti i tuoi documenti caricati e firmati
            </p>
          </div>

          {/* Componente basato sul ruolo */}
          {renderDocuments()}
        </div>
      </main>
    </div>
  );
}