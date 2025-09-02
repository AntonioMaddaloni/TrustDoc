
# 🛡️ TrustDoc

> **Trust your documents, securely signed and verified on-chain.**

**TrustDoc** è una DApp (Decentralized Application) progettata per la **firma digitale**, la **certificazione** e la **verifica** dell'integrità dei documenti PDF tramite **blockchain**, **IPFS** e ambienti sicuri come **TEE (Trusted Execution Environment)**. Può essere utilizzata in maniera indipendente o da aziende di terze parti per la gestione e la certificazione di documenti firmati.

---

## 🧱 Architettura del Sistema

```text
[ Utente ]
    |
    | 1) Interagisce con
    v
[ Frontend (Next.js) ]  <--- Visualizza PDF, firma, verifica
    |
    | 2) Invia file PDF + dati firma
    v
[ Backend (Node.js + Express) ]
    |
    | 3) Salva metadati in
    v
[ MongoDB ]
    |
    | 4) Carica PDF firmato su
    v
[ IPFS ]  -- restituisce hash univoco del file
    |
    | 5) Invoca calcolo e firma in ambiente sicuro
    v
[ TEE (OpenEnclave Avalon) ]
    |  (firma digitale, hash, proof)
    |
    | 6) Invio hash + firma + timestamp a
    v
[ Ethereum Smart Contract (Solidity) ] -- salva in blockchain
    |
    | 7) Fornisce metodo per
    v
[ Frontend ] -- verifica integrità e autenticità leggendo smart contract
```

---

## 🔐 Requisiti Funzionali – Focus Sicurezza

1. Registrazione sicura degli utenti con password hashata (bcrypt)
2. Autenticazione tramite JWT
3. Validazione input lato frontend e backend
4. Firma dei PDF **solo tramite TEE**, che genera:
   - Firma digitale
   - Hash del contenuto
   - Proof di firma
5. Upload del PDF firmato su IPFS
6. Scrittura immutabile su Ethereum
7. Possibilità di **revoca** dei documenti via smart contract

---

## 🛡️ TrustDoc – Descrizione Funzionale

### 👤 Registrazione Utente

L’utente che deve firmare un documento deve prima registrarsi. I dati richiesti sono:

- Nome  
- Cognome  
- Email  
- Password (crittografata con bcrypt)

---

### 🔐 Login e Accesso

Dopo la registrazione, l’utente può effettuare il login con email e password.

- Il sito è **inaccessibile finché non si è autenticati**
- Navbar disponibile dopo login:
  - Dashboard
  - I miei documenti
  - Profilo

---

### 📥 Dashboard – Caricamento e Firma

La dashboard presenta un box centrale per il caricamento del documento PDF.

**Requisiti del documento:**

- Formato: PDF  
- Upload: Uno alla volta  
- Dimensioni: TBD  

Dopo il caricamento:

- Visualizzazione asincrona dell’editor PDF
- Inserimento firma tramite:
  - Mouse (desktop)
  - Dita (mobile/tablet)

**Pulsanti disponibili:**

- `Cancella`: reset editor
- `Conferma`: applica firma e avvia:
  - Salvataggio PDF modificato
  - Firma tramite TEE
  - Upload su IPFS
  - Scrittura su Ethereum

---

### 📂 Sezione “I miei documenti”

Ogni documento caricato sarà visibile con le seguenti opzioni:

- `Download`: scarica PDF firmato
- `Revoca`: revoca certificato via blockchain (NON PER UTENTI INMDIPENDENTI)
- `Eliminazione`: rimuove documento dall'interfaccia e dal DB locale
- `Revoca + Eliminazione`: combina entrambe le azioni (NON PER UTENTI INMDIPENDENTI)

> ⚠️ La **revoca senza eliminazione** è utile per tracciare certificati invalidati a fini legali/amministrativi.

---

### 🙍‍♂️ Sezione “Profilo”

L’utente potrà:

- Visualizzare e modificare:
  - Nome
  - Cognome
  - Email
  - Password
- Verificare il proprio stato:
  - Utente indipendente
  - Utente appartenente a un’organizzazione

---

## 🏢 Gestione Organizzazioni e Ruoli

Il sistema supporta **organizzazioni** con ruoli gerarchici.

### 👑 Super Admin (`type = 0`)

Può accedere a 3 sezioni principali:

- `Crea Organizzazione`: registra nuove aziende
- `Crea Utente`: crea manualmente utenti (admin o standard)
- `Collega Utente a Organizzazione`: associa utenti in base all'ID o email

---

### 🛡️ Admin di Organizzazione (`type = 100`)

Gestisce la **propria** organizzazione:

- Collega utenti standard (`type = 200`) come dipendenti
- Sezione "Gestione Utenti":
  - Visualizza tutti gli utenti associati
  - Accede ai PDF firmati dei dipendenti
  - Revoca/elimina documenti in caso di errore

---

### 👤 Utente Standard (`type = 200`)

- Dipendente o collaboratore
- Può solo:
  - Firmare
  - Caricare
  - Gestire **i propri** documenti

---

## 🧪 Stack Tecnologico

| Componente         | Tecnologia                |
|--------------------|---------------------------|
| Frontend           | Next.js + Tailwind CSS    |
| Backend            | Node.js + Express         |
| Database           | MongoDB                   |
| Blockchain         | Ethereum (Smart Contracts)|
| Storage distribuito| IPFS                      |
| Sicurezza Firma    | TEE (es. OpenEnclave) |
| Autenticazione     | JWT + Bcrypt              |

---

## 📝 Licenza

Progetto creato a scopo didattico nell’ambito di un corso universitario.  
Non destinato all'uso in produzione senza adeguato controllo di sicurezza.

---

## ✨ Nome del Progetto

> **TrustDoc** – Trust your documents, securely signed and verified on-chain.
