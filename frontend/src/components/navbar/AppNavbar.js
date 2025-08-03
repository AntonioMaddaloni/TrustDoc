"use client";

import { useAuth } from "@/contexts/AuthContext";
import SuperAdminNavbar from "./SuperAdminNavbar";
import OrgAdminNavbar from "./OrgAdminNavbar";
import UserNavbar from "./UserNavbar";

export default function AppNavbar() {
  const { user, logout, isAuthenticated } = useAuth();

  // Se l'utente non è autenticato, non mostrare nulla
  if (!isAuthenticated || !user) {
    return null;
  }

  // Passiamo `user` e `logout` come props ai componenti figli
  const commonProps = {
    user: user,
    onLogout: logout,
  };

  // Usa uno switch per decidere quale Navbar renderizzare
  switch (user.role_type) {
    case 0: // Super Admin
      return <SuperAdminNavbar {...commonProps} />;
    case 100: // Organization Admin
      return <OrgAdminNavbar {...commonProps} />;
    default: // Independent User e altri casi
      return <UserNavbar {...commonProps} />;
  }
}