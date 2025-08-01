## 🛠 Architettura del Sistema

Il sistema garantisce **firma digitale**, **integrità** e **autenticità** dei documenti PDF tramite le seguenti tecnologie:

- **Next.js** per il frontend
- **Node.js + Express** per il backend
- **MongoDB** per lo storage dei metadati
- **IPFS** per la conservazione distribuita dei file
- **TEE (Hyperledger Avalon)** per la firma sicura
- **Ethereum (Smart Contract in Solidity)** per la certificazione sulla blockchain

### 🔁 Flusso di Lavoro

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
[ TEE (Hyperledger Avalon) ]
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

### ✅ Obiettivi principali

- Garantire **immutabilità** dei documenti firmati
- Verificare **l’autenticità** tramite smart contract
- Conservare **in modo decentralizzato** i documenti PDF
