"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/navbar/AppNavbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";

export default function ProfilePage() {
  const { user, isAuthenticated, loading } = useAuth();
  console.log('Dati utente dal contesto Auth:', user);
  const router = useRouter();
  // Stati per i dati del profilo
  const [profileData, setProfileData] = useState({
    name: '',
    surname: '',
    email: ''
  });
  
  // Stati per la gestione UI
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Stati per il cambio password
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Stati per la validazione
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Controllo autenticazione (come nel secondo file)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Carica i dati del profilo all'avvio
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  // Loading screen per l'autenticazione (come nel secondo file)
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

  // Funzione per caricare il profilo dal backend
  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await api.get('/profile/profile');
      if (response.data.success) {
        const userData = response.data.data;
        setProfileData({
          name: userData.name || '',
          surname: userData.surname || '',
          email: userData.email || '',
          created_at: userData.created_at || '',
          updated_at: userData.updated_at || '',
          organization_id: userData.organization_id || ''
        });
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      console.error('Errore caricamento profilo:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Errore nel caricamento del profilo' 
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Determina il tipo di utente per la visualizzazione
  const getUserStatus = () => {
    const roleType = user?.role;
    console.log('Ruolo utente:', roleType);
    switch (roleType) {
      case 0:
        return {
          type: 'Super Amministratore',
          detail: 'Accesso completo a tutto il sistema',
          badge: 'bg-red-100 text-red-800',
          icon: '👑'
        };
      case 100:
        return {
          type: 'Amministratore Organizzazione',
          detail: `Amministri l'organizzazione`,
          badge: 'bg-blue-100 text-blue-800',
          icon: '🏢'
        };
      default:
        return {
          type: 'Utente Indipendente',
          detail: 'Gestisci i tuoi documenti personali',
          badge: 'bg-green-100 text-green-800',
          icon: '👤'
        };
    }
  };

  // Validazione profilo
  const validateProfile = () => {
    const errors = {};
    
    if (!profileData.name.trim()) {
      errors.name = 'Il nome è obbligatorio';
    }
    
    if (!profileData.surname.trim()) {
      errors.surname = 'Il cognome è obbligatorio';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'L\'email è obbligatoria';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        errors.email = 'Formato email non valido';
      }
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validazione password
  const validatePassword = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Password corrente obbligatoria';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Nuova password obbligatoria';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'La password deve essere di almeno 8 caratteri';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Le password non corrispondono';
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'La nuova password deve essere diversa da quella corrente';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Gestisce l'aggiornamento del profilo
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      return;
    }
    
    setIsUpdating(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.put('/profile/profile', {
        name: profileData.name.trim(),
        surname: profileData.surname.trim(),
        email: profileData.email.trim().toLowerCase()
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profilo aggiornato con successo!' });
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      console.error('Errore aggiornamento profilo:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Errore nell\'aggiornamento del profilo' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Gestisce il cambio password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsChangingPassword(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Password cambiata con successo!' });
        // Reset form password
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordErrors({});
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      console.error('Errore cambio password:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Errore nel cambio password' 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userStatus = getUserStatus();

  // Loading interno per il caricamento del profilo
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Caricamento profilo...</span>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header della pagina */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Il Mio Profilo</h1>
            <p className="mt-2 text-gray-600">
              Gestisci le tue informazioni personali e la sicurezza del tuo account
            </p>
          </div>

          {/* Messaggio di feedback */}
          {message.text && (
            <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Stato Utente - Solo visualizzazione */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">{userStatus.icon}</span>
                <span>Il Tuo Stato</span>
              </CardTitle>
              <CardDescription>
                Informazioni sul tuo tipo di account e permessi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${userStatus.badge}`}>
                  {userStatus.type}
                </span>
                <span className="text-gray-600">{userStatus.detail}</span>
              </div>
              
              {user?.organization_id && (
                <div className="mt-3 text-sm text-gray-500">
                  <strong>ID Organizzazione:</strong> {user.organization_id}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Modifica Profilo */}
            <Card>
              <CardHeader>
                <CardTitle>Modifica Profilo</CardTitle>
                <CardDescription>
                  Aggiorna le tue informazioni personali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className={profileErrors.name ? 'border-red-500' : ''}
                      placeholder="Il tuo nome"
                    />
                    {profileErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{profileErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="surname">Cognome</Label>
                    <Input
                      id="surname"
                      type="text"
                      value={profileData.surname}
                      onChange={(e) => setProfileData(prev => ({ ...prev, surname: e.target.value }))}
                      className={profileErrors.surname ? 'border-red-500' : ''}
                      placeholder="Il tuo cognome"
                    />
                    {profileErrors.surname && (
                      <p className="text-red-600 text-sm mt-1">{profileErrors.surname}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className={profileErrors.email ? 'border-red-500' : ''}
                      placeholder="la-tua-email@esempio.com"
                    />
                    {profileErrors.email && (
                      <p className="text-red-600 text-sm mt-1">{profileErrors.email}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Aggiornamento...
                      </>
                    ) : (
                      'Aggiorna Profilo'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Form Cambio Password */}
            <Card>
              <CardHeader>
                <CardTitle>Cambia Password</CardTitle>
                <CardDescription>
                  Aggiorna la tua password per mantenere sicuro l'account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Password Corrente</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                      placeholder="Inserisci la password corrente"
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-red-600 text-sm mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newPassword">Nuova Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={passwordErrors.newPassword ? 'border-red-500' : ''}
                      placeholder="Almeno 8 caratteri"
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-red-600 text-sm mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
                      placeholder="Ripeti la nuova password"
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-red-600 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    <strong>Requisiti password:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• Almeno 8 caratteri</li>
                      <li>• Diversa dalla password corrente</li>
                      <li>• Deve corrispondere alla conferma</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cambiando Password...
                      </>
                    ) : (
                      'Cambia Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}