const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;


// Definizione dello schema per i documenti
const documentSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlenght: [2, 'Il nome deve avere almeno 2 caratteri'],
    maxlength: [50, 'Il nome deve avere al massimo 50 caratteri']
  },
  created_by: {
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
 
}, {
  timestamps: { createdAt: 'create_at', updatedAt: 'updated_at' } // Aggiunge create_at e updated_at automatici
});

const Orgnizations = model('Organizations', organizationsSchema)

module.exports = Orgnizations;