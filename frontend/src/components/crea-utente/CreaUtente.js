"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function CreaUtente() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [role_type, setRoleType] = useState("200"); // default: Independent User (200)

  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success' or 'error'

  const emailIsValid = (value) => {
    // semplice validazione email
    return /^\S+@\S+\.\S+$/.test(value);
  };

  const handleCreateUser = async () => {
    // Basic validation
    if (!name.trim() || !surname.trim() || !email.trim()) {
      setMessage("Per favore, compila tutti i campi richiesti.");
      setMessageType("error");
      return;
    }

    if (!emailIsValid(email.trim())) {
      setMessage("Per favore, inserisci un'email valida.");
      setMessageType("error");
      return;
    }

    setIsCreating(true);
    setMessage(null);
    setMessageType(null);

    try {
      const payload = {
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        role_type: Number(role_type),
      };

      const { data, status } = await api.post("/admin/user", payload);

      if (![200, 201].includes(status)) {
        throw new Error(data?.message || "Risposta non valida dal server");
      }

      // Gestisci il caso in cui è stata generata una password automatica
      let successMessage = data?.message || `Utente "${name} ${surname}" creato con successo!`;
      
      if (data?.data?.generated_password) {
        successMessage += `\n\nPassword generata: ${data.data.generated_password}`;
        successMessage += `\n${data.data.password_info || 'Ricorda di cambiarla al primo accesso.'}`;
      }

      setMessage(successMessage);
      setMessageType("success");

      // Reset campi
      setName("");
      setSurname("");
      setEmail("");
      setRoleType("200");
    } catch (error) {
      console.error("Errore nella creazione dell'utente:", error);
      let errorMessage = "Errore durante la creazione dell'utente.";

      if (error.response) {
        const { status, data } = error.response;
        if (status === 409) {
          errorMessage = "Email già in uso";
        } else if (status === 412) {
          errorMessage = data?.message || "Dati non validi o incompleti";
        } else if (status >= 500) {
          errorMessage = "Errore interno del server";
        } else {
          errorMessage = data?.message || data?.error || error.message;
        }
      } else if (error.request) {
        errorMessage = "Nessuna risposta dal server. Controlla la connessione.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setName("");
    setSurname("");
    setEmail("");
    setRoleType("200");
    setMessage(null);
    setMessageType(null);
  };

  // Componentino per mostrare la descrizione del ruolo selezionato
  const RoleDescription = ({ selected }) => {
    const descriptions = {
      "0": "Accesso completo: gestisce l'intero sistema.",
      "100": "Gestisce la propria organizzazione.",
      "200": "Dipendente o collaboratore può solo: Firmare, caricare e gestire i propri documenti.",
    };

    return <p className="text-xs text-slate-500 mt-2">{descriptions[selected] ?? ""}</p>;
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <Card>
        <CardHeader>
          <CardTitle>Crea un nuovo utente</CardTitle>
          <CardDescription>Inserisci i dettagli per creare un nuovo utente nel sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Form per la creazione */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-blue-900 font-medium">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Mario"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isCreating}
                    className="mt-2"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label htmlFor="surname" className="text-blue-900 font-medium">Cognome</Label>
                  <Input
                    id="surname"
                    type="text"
                    placeholder="Rossi"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    disabled={isCreating}
                    className="mt-2"
                    maxLength={50}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="email" className="text-blue-900 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario.rossi@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isCreating}
                    className="mt-2"
                    maxLength={254}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="role_type" className="text-blue-900 font-medium">Tipo utente</Label>

                  {/* Select migliorata: styling + freccia + descrizione dinamica */}
                  <div className="relative mt-2">
                    <select
                      id="role_type"
                      value={role_type}
                      onChange={(e) => setRoleType(e.target.value)}
                      disabled={isCreating}
                      className="appearance-none w-full rounded-md border px-4 py-2 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    >
                      <option value="0">Super Admin (0)</option>
                      <option value="100">Admin di organizzazione (100)</option>
                      <option value="200">Utente Standard (200)</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Descrizione ruolo dinamica */}
                  <RoleDescription selected={role_type} />
                </div>

                <div className="md:col-span-2 flex items-center space-x-4">
                  <Button
                    onClick={handleCreateUser}
                    disabled={isCreating || !name.trim() || !surname.trim() || !email.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCreating ? "Creazione in corso..." : "Conferma Creazione"}
                  </Button>

                  <Button variant="outline" onClick={handleReset} disabled={isCreating}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            {/* Messaggio di stato */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  messageType === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                <div className={`${messageType === "success" ? "text-green-700" : "text-red-700"} font-medium`}>
                  <p className="mb-2">
                    {messageType === "success" ? "✓ " : "⚠ "}
                    {message.split('\n')[0]}
                  </p>
                </div>
              </div>
            )}

            {/* Informazioni aggiuntive */}
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-purple-900">Informazioni</h3>
              <div className="text-purple-700 mt-2 space-y-2">
                <p>• L'email deve essere unica nel sistema</p>
                <p>• Verrà genearta una password temporanea, sarà inviata all'email selezionata.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}