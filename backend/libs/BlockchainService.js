// services/blockchainService.js
const { ethers } = require('ethers');
const contractABI = require('../../blockchain/artifacts/contracts/DocumentStorageWithDeletes.sol/DocumentStorageWithDeletes.json'); // ABI del contratto

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.initialized = false;
  }

  /**
   * Inizializza il servizio blockchain
   */
  async initialize() {
    try {
      // Configurazione provider (Hardhat local, Sepolia, ecc.)
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Configurazione wallet
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('BLOCKCHAIN_PRIVATE_KEY non configurata nelle variabili ambiente');
      }

      this.wallet = new ethers.Wallet(privateKey, this.provider);

      // Indirizzo del contratto deployato
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('CONTRACT_ADDRESS non configurato nelle variabili ambiente');
      }

      // Inizializza contratto
      this.contract = new ethers.Contract(contractAddress, contractABI.abi, this.wallet);

      // Test connessione
      await this.provider.getBlockNumber();
      console.log('✅ Blockchain service inizializzato correttamente');
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione blockchain:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se il servizio è inizializzato
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('Blockchain service non inizializzato. Chiama initialize() prima.');
    }
  }

  /**
   * Memorizza un documento sulla blockchain
   * @param {string} fileName - Nome del file
   * @param {number} fileSize - Dimensione del file in bytes
   * @param {string} teeHash - Hash TEE del documento
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async storeDocument(fileName, fileSize, teeHash) {
    this._checkInitialized();

    try {
      console.log('📝 Memorizzazione documento su blockchain...');
      console.log(`   File: ${fileName}`);
      console.log(`   Size: ${fileSize} bytes`);
      console.log(`   TEE Hash: ${teeHash}`);

      // Verifica se esiste già un documento con stesso hash
      const existingId = await this.contract.getDocumentIdByTee(teeHash);
      if (existingId > 0) {
        const existingDoc = await this.contract.getDocument(existingId);
        if (existingDoc.isActive) {
          throw new Error(`Documento già esistente con TEE Hash: ${teeHash}`);
        }
        console.log(`   Documento precedente soft-deleted trovato (ID: ${existingId}), procedo...`);
      }

      // Stima gas per la transazione
      const gasEstimate = await this.contract.storeDocument.estimateGas(fileName, fileSize, teeHash);
      console.log(`   Gas stimato: ${gasEstimate.toString()}`);

      // Esegui transazione
      const tx = await this.contract.storeDocument(fileName, fileSize, teeHash, {
        gasLimit: gasEstimate * 120n / 100n // +20% di margine
      });

      console.log(`   Hash transazione: ${tx.hash}`);
      console.log('   Attendendo conferma...');

      // Attendi conferma
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transazione fallita');
      }

      // Estrai documentId dall'evento DocumentStored
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'DocumentStored';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('Evento DocumentStored non trovato nei logs');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const documentId = parsedEvent.args.documentId.toString();

      console.log(`✅ Documento memorizzato con successo!`);
      console.log(`   Document ID: ${documentId}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        success: true,
        documentId: documentId,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('❌ Errore memorizzazione blockchain:', error.message);
      
      // Gestione errori specifici
      if (error.message.includes('Documento gia esistente attivo')) {
        throw new Error('Documento già esistente sulla blockchain');
      }
      
      if (error.message.includes('insufficient funds')) {
        throw new Error('Fondi insufficienti per la transazione blockchain');
      }

      throw new Error(`Errore blockchain: ${error.message}`);
    }
  }

  /**
   * Recupera un documento dalla blockchain
   * @param {number} documentId - ID del documento
   * @returns {Promise<Object>} Dati del documento
   */
  async getDocument(documentId) {
    this._checkInitialized();

    try {
      const doc = await this.contract.getDocument(documentId);
      
      return {
        id: documentId,
        fileName: doc.fileName,
        fileSize: doc.fileSize.toString(),
        teeHash: doc.teeHash,
        uploader: doc.uploader,
        timestamp: new Date(Number(doc.timestamp) * 1000),
        isActive: doc.isActive
      };
    } catch (error) {
      throw new Error(`Errore recupero documento: ${error.message}`);
    }
  }

  /**
   * Trova un documento tramite TEE hash
   * @param {string} teeHash - Hash TEE da cercare
   * @returns {Promise<Object|null>} Documento trovato o null
   */
  async getDocumentByTeeHash(teeHash) {
    this._checkInitialized();

    try {
      const documentId = await this.contract.getDocumentIdByTee(teeHash);
      
      if (documentId === 0) {
        return null;
      }

      return await this.getDocument(documentId);
    } catch (error) {
      throw new Error(`Errore ricerca documento: ${error.message}`);
    }
  }

  /**
   * Soft delete di un documento
   * @param {number} documentId - ID del documento
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async softDeleteDocument(documentId) {
    this._checkInitialized();

    try {
      const tx = await this.contract.softDeleteDocument(documentId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Errore soft delete: ${error.message}`);
    }
  }

  /**
   * Ripristina un documento soft-deleted
   * @param {number} documentId - ID del documento
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async restoreDocument(documentId) {
    this._checkInitialized();

    try {
      const tx = await this.contract.restoreDocument(documentId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Errore ripristino: ${error.message}`);
    }
  }

  /**
   * Hard delete di un documento (solo owner)
   * @param {number} documentId - ID del documento
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async hardDeleteDocument(documentId) {
    this._checkInitialized();

    try {
      const tx = await this.contract.hardDeleteDocument(documentId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Errore hard delete: ${error.message}`);
    }
  }

  /**
   * Ottieni statistiche del contratto
   * @returns {Promise<Object>} Statistiche
   */
  async getContractStats() {
    this._checkInitialized();

    try {
      const totalDocuments = await this.contract.getTotalDocuments();
      const owner = await this.contract.owner();
      
      return {
        totalDocuments: totalDocuments.toString(),
        owner: owner,
        contractAddress: await this.contract.getAddress()
      };
    } catch (error) {
      throw new Error(`Errore statistiche: ${error.message}`);
    }
  }

  /**
   * Verifica se l'utente corrente è il proprietario del contratto
   * @returns {Promise<boolean>} True se è owner
   */
  async isOwner() {
    this._checkInitialized();

    try {
      const owner = await this.contract.owner();
      return owner.toLowerCase() === this.wallet.address.toLowerCase();
    } catch (error) {
      throw new Error(`Errore verifica owner: ${error.message}`);
    }
  }

  /**
   * Ottieni il balance del wallet
   * @returns {Promise<string>} Balance in ETH
   */
  async getWalletBalance() {
    this._checkInitialized();

    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Errore balance: ${error.message}`);
    }
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  blockchainService,
  BlockchainService
};