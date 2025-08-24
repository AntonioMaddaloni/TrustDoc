const express = require("express");
const router = express.Router();
const multer = require("multer");
const authLib = require("../libs/authLib");
const UserDB = require("../libs/userDB");
const DocumentDB = require("../libs/documentDB");
const fs = require("fs");
const path = require("path");
const docInsertValidator = require("../validators/docInsertValidator");
const TeeService = require('../libs/TeeService');
const { blockchainService } = require('../libs/BlockchainService'); 

// Carica variabili d'ambiente
require('dotenv').config();
const IPFS_API_URL = process.env.IPFS_API_URL || 'http://127.0.0.1:5001/api/v0';

// Inizializza client IPFS con import dinamico
let ipfs;
const initIPFS = async () => {
  if (!ipfs) {
    const { create } = await import('ipfs-http-client');
    ipfs = create({ url: IPFS_API_URL });
  }
  return ipfs;
};

//Configurazione TEE
const teeService = new TeeService({
  simulate: true, // true per sviluppo, false per produzione
  useWsl: true, // true su Windows, false su Linux
  timeout: 30000 // 30 secondi timeout
});

// Configurazione multer per l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/pdfs";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `pdf-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

router.use(express.json());

router
  .post("/", authLib(200), upload.single("pdf"), docInsertValidator, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      // Inizializza IPFS client
      const ipfsClient = await initIPFS();

      // Aggiunta del file a IPFS
      const fileBuffer = fs.readFileSync(req.file.path);
      const result = await ipfsClient.add(fileBuffer);
      const cid = result.cid.toString();

      // Pinna il file per mantenerlo nel nodo locale
      await ipfsClient.pin.add(cid);
      console.log(`File pinnato con CID: ${cid}`);

      // Aggiungi il file al MFS (Mutable File System) per vederlo in IPFS Desktop
      const fileName = req.file.originalname || `pdf-${Date.now()}.pdf`;
      const mfsPath = `/uploaded-pdfs/${fileName}`;
      
      // Crea la directory se non esiste
      try {
        await ipfsClient.files.mkdir('/uploaded-pdfs', { parents: true });
      } catch (err) {
        // Directory già esistente, ignora l'errore
        if (!err.message.includes('file already exists')) {
          console.warn('Errore creazione directory:', err.message);
        }
      }

      // Copia il file nel MFS
      await ipfsClient.files.cp(`/ipfs/${cid}`, mfsPath);
      console.log(`File aggiunto al MFS: ${mfsPath}`);

      // TEE
      let teeHash;
      try {
        teeHash = await teeService.computeHash(fileBuffer);
        console.log(`Hash TEE: ${teeHash}`);
        
        // Ora puoi rimuovere il file temporaneo
        fs.unlinkSync(req.file.path);          
      } catch (teeError) {
        console.error('Errore TEE:', teeError.message);
        // Cleanup in caso di errore
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error('Errore cleanup:', cleanupError);
          }
        }
        return res.status(500).json({
          success: false,
          message: 'Errore calcolo hash TEE'
        });
      }

      // 🔗 CODICE PER LA BLOCKCHAIN
      let blockchainResult = null;
      try {
        // Inizializza il servizio blockchain se non già fatto
        if (!blockchainService.initialized) {
          await blockchainService.initialize();
        }

        // Memorizza il documento sulla blockchain
        blockchainResult = await blockchainService.storeDocument(
          fileName,
          result.size,
          teeHash
        );

        console.log('✅ Documento memorizzato sulla blockchain:', blockchainResult);

      } catch (blockchainError) {
        console.error('❌ Errore blockchain:', blockchainError.message);
        
        // Decidi se vuoi che l'errore blockchain blocchi tutto l'upload
        // Opzione 1: Blocca tutto (più sicuro)
        return res.status(500).json({
          success: false,
          message: `Errore memorizzazione blockchain: ${blockchainError.message}`,
          partialData: {
            ipfs: {
              cid,
              size: result.size
            },
            teeHash
          }
        });
      }

      // 💾 SALVATAGGIO NEL DATABASE LOCALE
      let databaseResult = null;
      try {
        // Prepara i dati per il database
        const documentInfo = {
          // Dati base
          title: req.body.title || fileName, // Titolo dal body o usa il filename
          filename: fileName,
          owner_id: req.user?.id || null, // ID dell'utente autenticato
          
          // Status iniziali
          signed: false, // Documento non ancora firmato
          signed_at: null,
          revoked: false, // Non revocato
          revoked_at: null,
          deleted: false, // Non eliminato
          
          // Hashes e riferimenti
          ipfs_hash: cid, // CID di IPFS
          blockchain_id: blockchainResult.documentId, // ID dalla blockchain
          tee_hash: teeHash, // Hash TEE
          
          // Timestamps automatici (se il tuo ORM li gestisce automaticamente, puoi omettere)
          create_at: new Date(),
          updateted_at: new Date()
        };

        // Salva nel database
        databaseResult = await DocumentDB.createDocument(documentInfo);
        
        console.log('✅ Documento salvato nel database:', databaseResult.id);

      } catch (databaseError) {
        console.error('❌ Errore database:', databaseError.message);
        
        // Successo parziale con warning
        return res.status(207).json({ // 207 = Multi-Status
          success: true,
          warning: 'Documento memorizzato su IPFS e blockchain, ma errore nel database locale',
          message: "Caricamento completato con warning",
          data: {
            ipfs: {
              cid,
              size: result.size,
              url: `${process.env.IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs'}/${cid}`,
              mfsPath
            },
            tee: {
              hash: teeHash
            },
            blockchain: {
              documentId: blockchainResult.documentId,
              transactionHash: blockchainResult.transactionHash,
              blockNumber: blockchainResult.blockNumber,
              gasUsed: blockchainResult.gasUsed
            },
            database: {
              error: databaseError.message,
              retry: true
            },
            metadata: {
              fileName,
              originalName: req.file.originalname,
              uploadedAt: new Date().toISOString()
            }
          }
        });
      }

      // 🎉 SUCCESSO COMPLETO - Tutto è andato bene
      return res.status(200).json({
        success: true,
        message: "PDF caricato e memorizzato con successo su tutti i sistemi!",
        data: {
          // Dati IPFS
          ipfs: {
            cid,
            size: result.size,
            url: `${process.env.IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs'}/${cid}`,
            mfsPath
          },
          // Dati TEE
          tee: {
            hash: teeHash
          },
          // Dati Blockchain
          blockchain: {
            documentId: blockchainResult.documentId,
            transactionHash: blockchainResult.transactionHash,
            blockNumber: blockchainResult.blockNumber,
            gasUsed: blockchainResult.gasUsed
          },
          // Dati Database
          database: {
            id: databaseResult.id,
            createdAt: databaseResult.createdAt
          },
          // Metadata generali
          metadata: {
            fileName,
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error('❌ Errore generale:', error);
      
      // Cleanup in caso di errore generale
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Errore cleanup finale:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Errore interno del server',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Errore interno'
      });
    }
  })

.get("/files", authLib(200), async (req, res) => {
    try {
      const ipfsClient = await initIPFS();
      const files = [];
      
      // Lista i file nella directory uploaded-pdfs
      try {
        for await (const file of ipfsClient.files.ls('/uploaded-pdfs')) {
          files.push({
            name: file.name,
            cid: file.cid.toString(),
            size: file.size,
            type: file.type,
            url: `${process.env.IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs'}/${file.cid.toString()}`
          });
        }
      } catch (err) {
        // Directory non esiste ancora
        console.log('Directory uploaded-pdfs non trovata');
      }
      
      res.json({
        success: true,
        data: files
      });
    } catch (err) {
      console.error('Errore nel recuperare i file MFS:', err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recuperare i file'
      });
    }
  })
  .get("/pinned", authLib(200), async (req, res) => {
    try {
      const ipfsClient = await initIPFS();
      const pinnedFiles = [];
      
      for await (const pin of ipfsClient.pin.ls({ type: 'all' })) {
        pinnedFiles.push({
          cid: pin.cid.toString(),
          url: `${process.env.IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs'}/${pin.cid.toString()}`
        });
      }
      
      res.json({
        success: true,
        data: pinnedFiles
      });
    } catch (err) {
      console.error('Errore nel recuperare i file pinnati:', err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recuperare i file pinnati'
      });
    }
  })
  .delete("/fisical/:cid", authLib(200), async (req, res) => {
    try {
      const { cid } = req.params;
      const ipfsClient = await initIPFS();

      // 1. Unpin il file
      await ipfsClient.pin.rm(cid);
      console.log(`File unpinned: ${cid}`);

      // 2. Rimuovi dal MFS se presente (cerca in uploaded-pdfs)
      try {
        const files = ipfsClient.files.ls('/uploaded-pdfs');
        for await (const file of files) {
          if (file.cid.toString() === cid) {
            await ipfsClient.files.rm(`/uploaded-pdfs/${file.name}`);
            console.log(`File rimosso dal MFS: ${file.name}`);
            break;
          }
        }
      } catch (err) {
        console.log('File non trovato nel MFS o directory non esiste');
      }

      // 3. Esegui garbage collection
      await ipfsClient.repo.gc();
      console.log('Garbage collection completata');

      res.json({
        success: true,
        message: 'File rimosso dal nodo locale',
        note: 'Il file potrebbe essere ancora disponibile su altri nodi IPFS'
      });

    } catch (err) {
      console.error('Errore rimozione file:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  })
  .delete("/all/purge", authLib(200), async (req, res) => {
    try {
      const ipfsClient = await initIPFS();
      let removedCount = 0;

      // Unpin tutti i file (esclude i pin di sistema)
      for await (const pin of ipfsClient.pin.ls({ type: 'recursive' })) {
        try {
          await ipfsClient.pin.rm(pin.cid);
          removedCount++;
        } catch (err) {
          console.log(`Impossibile rimuovere pin: ${pin.cid}`);
        }
      }

      // Rimuovi tutti i file dal MFS
      try {
        await ipfsClient.files.rm('/uploaded-pdfs', { recursive: true });
      } catch (err) {
        console.log('Directory uploaded-pdfs non trovata');
      }

      // Garbage collection
      await ipfsClient.repo.gc();

      res.json({
        success: true,
        message: `${removedCount} file rimossi dal nodo locale`,
        warning: 'I file potrebbero essere ancora disponibili su altri nodi IPFS'
      });

    } catch (err) {
      console.error('Errore purge completo:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  })

  // NUOVA ROTTA DELETE COMPLETA PER DOCUMENTI
  .delete('/delete/:id', authLib(), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id.toString();
      const userRole = req.user.role_type;
      
      console.log(`Richiesta eliminazione completa documento ${id} da utente ${userId} (ruolo: ${userRole})`);
   
      
      // Validazione ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID documento non fornito'
        });
      }
      
      // Trova il documento nel database
      const document = await DocumentDB.getDocumentById(id);
      
        console.log('=== DEBUG OWNERSHIP ===');
        console.log('req.user:', req.user);
        console.log('userId ricavato:', req.user?.id || req.user?._id);
        console.log('document.owner_id:', document.owner_id);
        console.log('Tipi:', typeof document.owner_id, 'vs', typeof (req.user?.id || req.user?._id));
        console.log('Confronto strict:', document.owner_id === (req.user?.id || req.user?._id));
        console.log('Confronto loose:', document.owner_id == (req.user?.id || req.user?._id));

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Documento non trovato'
        });
      }
      
      // VERIFICA PERMESSI - Solo Independent User può eliminare i propri documenti
      if (userRole === 0 || userRole === 100) {
        return res.status(403).json({
          success: false,
          message: 'Gli amministratori non possono eliminare documenti. Solo gli utenti indipendenti possono eliminare i propri documenti.'
        });
      }
      
      // Verifica che sia il proprietario del documento
      if (document.owner_id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Puoi eliminare solo i tuoi documenti'
        });
      }
      
      console.log(`Permessi verificati per documento: ${document.filename}`);
      
      // Risultati delle eliminazioni
      const deletionResults = {
        database: false,
        ipfs: false,
        blockchain: false,
        errors: []
      };
      
      // 1. ELIMINAZIONE DAL DATABASE
      try {
        console.log('Eliminazione dal database...');
        const dbResult = await DocumentDB.deleteDocument(id);
        deletionResults.database = !!dbResult;
        console.log(`Database: ${deletionResults.database ? 'SUCCESS' : 'FAILED'}`);
      } catch (dbError) {
        console.error('Errore database:', dbError.message);
        deletionResults.errors.push(`Database: ${dbError.message}`);
      }
      
      // 2. ELIMINAZIONE DA IPFS
      if (document.ipfs_hash) {
        try {
          console.log(`Eliminazione da IPFS (CID: ${document.ipfs_hash})...`);
          const ipfsClient = await initIPFS();
          
          // Unpin il file
          await ipfsClient.pin.rm(document.ipfs_hash);
          console.log(`File unpinned: ${document.ipfs_hash}`);
          
          // Rimuovi dal MFS se presente
          try {
            const files = ipfsClient.files.ls('/uploaded-pdfs');
            for await (const file of files) {
              if (file.cid.toString() === document.ipfs_hash) {
                await ipfsClient.files.rm(`/uploaded-pdfs/${file.name}`);
                console.log(`File rimosso dal MFS: ${file.name}`);
                break;
              }
            }
          } catch (mfsError) {
            console.log('File non trovato nel MFS');
          }
          
          // Garbage collection
          await ipfsClient.repo.gc();
          console.log('Garbage collection completata');
          
          deletionResults.ipfs = true;
          console.log('IPFS: SUCCESS');
          
        } catch (ipfsError) {
          console.error('Errore IPFS:', ipfsError.message);
          deletionResults.errors.push(`IPFS: ${ipfsError.message}`);
        }
      } else {
        deletionResults.ipfs = true; // Nessun hash IPFS da eliminare
        console.log('IPFS: Nessun hash da eliminare');
      }
      
      // 3. SOFT DELETE DALLA BLOCKCHAIN
      if (document.blockchain_id) {
        try {
          console.log(`Soft delete dalla blockchain (ID: ${document.blockchain_id})...`);
          
          // Inizializza il servizio blockchain
          if (!blockchainService.initialized) {
            await blockchainService.initialize();
          }
          
          // Soft delete del documento sulla blockchain
          const blockchainResult = await blockchainService.softDeleteDocument(document.blockchain_id);
          
          deletionResults.blockchain = blockchainResult.success;
          console.log('Blockchain: SUCCESS', blockchainResult);
          
        } catch (blockchainError) {
          console.error('Errore Blockchain:', blockchainError.message);
          deletionResults.errors.push(`Blockchain: ${blockchainError.message}`);
        }
      } else {
        deletionResults.blockchain = true; // Nessun ID blockchain da eliminare
        console.log('Blockchain: Nessun ID da eliminare');
      }
      
      // RISPOSTA FINALE
      const allSuccess = deletionResults.database && deletionResults.ipfs && deletionResults.blockchain;
      const successCount = [deletionResults.database, deletionResults.ipfs, deletionResults.blockchain].filter(Boolean).length;
      
      if (allSuccess) {
        console.log('Eliminazione completa riuscita!');
        return res.json({
          success: true,
          message: 'Documento eliminato completamente da tutti i sistemi',
          data: {
            documentId: id,
            fileName: document.filename,
            deletedFrom: ['database', 'ipfs', 'blockchain'],
            details: deletionResults
          }
        });
      } else if (successCount > 0) {
        console.log(`Eliminazione parziale: ${successCount}/3 sistemi`);
        return res.status(207).json({ // 207 Multi-Status
          success: false,
          message: `Eliminazione parziale completata (${successCount}/3 sistemi)`,
          data: {
            documentId: id,
            fileName: document.filename,
            deletedFrom: [
              deletionResults.database ? 'database' : null,
              deletionResults.ipfs ? 'ipfs' : null,
              deletionResults.blockchain ? 'blockchain' : null
            ].filter(Boolean),
            details: deletionResults,
            errors: deletionResults.errors
          }
        });
      } else {
        console.log('Eliminazione fallita completamente');
        return res.status(500).json({
          success: false,
          message: 'Eliminazione fallita su tutti i sistemi',
          data: {
            documentId: id,
            fileName: document.filename,
            deletedFrom: [],
            details: deletionResults,
            errors: deletionResults.errors
          }
        });
      }
      
    } catch (error) {
      console.error('Errore generale eliminazione documento:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Errore interno del server durante l\'eliminazione',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })

  .get('/my', authLib(), async (req, res) => { //tutti lo possono fare, infatti posso prendere solo i miei di documenti, quindi non serve una restrizione, ma solo autenticazione
    try{
      let docs = await DocumentDB.getMyDocuments(req.user._id);
      return res.status(200).json({
        success: true,
        message: "Miei Documenti ritornati con successo",
        data: docs
      });
    }catch(err) {
      console.error('Errore get miei dati:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  })
  .get('/myorganization', authLib(100), async (req, res) => { //solo gli admin di un organizzaizone possono accedere a questa rotta
    try{
      if(!req.user.organization_id)
      {
        res.status(404).json({
          success: false,
          message: "Non sei assegnato ad alcuna organizzazione"
        });
      }
      let users = await UserDB.getUsersByOrganization(req.user.organization_id);
      let docs = await DocumentDB.getDocumentsByMyOrganizationUser(users);
      return res.status(200).json({
        success: true,
        message: "I Documenti della mia organizzazione sono stati ritornati con successo",
        data: docs
      });
    }catch(err) {
      console.error('Errore get miei dati:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  });

// Endpoint per verificare lo stato del nodo IPFS
router.get("/status", async (req, res) => {
  try {
    const ipfsClient = await initIPFS();
    const nodeId = await ipfsClient.id();
    
    res.json({
      success: true,
      data: {
        id: nodeId.id,
        agentVersion: nodeId.agentVersion,
        addresses: nodeId.addresses
      }
    });
  } catch (err) {
    console.error('Errore connessione IPFS:', err);
    res.status(500).json({
      success: false,
      message: 'Nodo IPFS non raggiungibile'
    });
  }
});

// Gestione errori multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({
        success: false,
        errors: [{ msg: "File size too large (max 10MB)", param: "pdf" }]
      });
    }
  }

  if (error.message === "Only PDF files are allowed") {
    return res.status(422).json({
      success: false,
      errors: [{ msg: "Only PDF files are allowed", param: "pdf" }]
    });
  }

  res.status(500).json({
    success: false,
    message: "Server error during file upload"
  });
});

module.exports = router;