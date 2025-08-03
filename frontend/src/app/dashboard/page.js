"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppNavbar from "@/components/navbar/AppNavbar";

// Importa i componenti delle dashboard specifiche
import UserDashboard from "@/components/dashboards/UserDashboard";
// Importa gli altri se li hai già creati o li creerai:
// import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
// import OrganizationAdminDashboard from "@/components/dashboards/OrganizationAdminDashboard";


export default function DashboardPage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
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

  // Logica di routing basata sul ruolo dell'utente
  const renderDashboard = () => {
    if (!user) {
      return null; // O un fallback se l'oggetto user non è ancora disponibile
    }

    switch (user.role_type) {
      case 0: // Super Admin
        // return <SuperAdminDashboard user={user} />;
        return <p>Dashboard Super Admin in sviluppo...</p>; // Placeholder
      case 100: // Organization Admin
        // return <OrganizationAdminDashboard user={user} />;
        return <p>Dashboard Organization Admin in sviluppo...</p>; // Placeholder
      default: // Independent User (o qualsiasi altro ruolo non specificato)
        return <UserDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderDashboard()}
      </main>
    </div>
  );
}