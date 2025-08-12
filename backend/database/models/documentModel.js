const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

// Definizione dello schema per i documenti
const documentSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [255, 'Il titolo deve avere al massimo 255 caratteri']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true,
    maxlength: [255, 'Il nome del file deve avere al massimo 255 caratteri']
  },
  owner_id: {
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  signed: {
    type: Boolean,
    default: false // Indica se il documento è firmato
  },
  signed_at: {
    type: Date,
    default: null // Timestamp della firma, valorizzato automaticamente
  },
  ipfs_hash: {
    type: String,
    trim: true,
    default: null,
    match: [/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, 'Invalid IPFS CID'] // Validazione del CID IPFS
  },
  blockchain_id: {
    type: String,
    trim: true,
    default: null // Identificativo univoco della transazione in blockchain
  },
  tee_hash: {
    type: String,
    trim: true,
    default: null // Identificativo univoco del tee_hash
  },
  revoked: {
    type: Boolean,
    default: false // Indica se il documento è stato revocato
  },
  revoked_at: {
    type: Date,
    default: null // Timestamp della revoca, valorizzato automaticamente
  },
  deleted: {
    type: Boolean,
    default: false // Soft-delete del documento
  }
}, {
  timestamps: { createdAt: 'create_at', updatedAt: 'updated_at' } // Aggiunge create_at e updated_at automatici
});

// Indici per ottimizzazione delle query e vincoli di unicità
// Ricerca veloce per proprietario
documentSchema.index({ owner_id: 1 });
// Unicità dell'hash IPFS solo quando presente
documentSchema.index({ ipfs_hash: 1 }, { unique: true, sparse: true });
// Unicità dell'ID in blockchain solo quando presente
documentSchema.index({ blockchain_id: 1 }, { unique: true, sparse: true });

// Hook prima del salvataggio per gestire signed_at e revoked_at
// Se imposto signed = true e signed_at non è valorizzato, lo setto automaticamente
documentSchema.pre('save', function(next) {
  if (this.isModified('signed') && this.signed && !this.signed_at) {
    this.signed_at = new Date();
  }
  next();
});
// Se imposto revoked = true e revoked_at non è valorizzato, lo setto automaticamente
documentSchema.pre('save', function(next) {
  if (this.isModified('revoked') && this.revoked && !this.revoked_at) {
    this.revoked_at = new Date();
  }
  next();
});

// Metodi di istanza per operazioni comuni sul documento
/**
 * Marca il documento come firmato, impostando hash IPFS e ID blockchain
 * @param {String} ipfsHash - CID restituito da IPFS
 * @param {String} blockchainId - Transazione salvata su blockchain
 * @returns {Promise<Document>}
 */
documentSchema.methods.markSigned = function(ipfsHash, blockchainId) {
  this.signed = true;
  this.ipfs_hash = ipfsHash;
  this.blockchain_id = blockchainId;
  return this.save();
};

/**
 * Revoca il documento, impostando revoked = true e revoked_at
 * @returns {Promise<Document>}
 */
documentSchema.methods.revoke = function() {
  this.revoked = true;
  return this.save();
};

// Opzionale: indice TTL per rimuovere i documenti soft-deleted dopo 30 giorni
// documentSchema.index({ updated_at: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { deleted: true } });

// Creazione del modello e export
const Document = model('Document', documentSchema);

module.exports = Document;
