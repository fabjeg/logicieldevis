const { Schema, model } = require('mongoose');

const adresseSchema = new Schema(
  {
    rue: { type: String, default: '' },
    codePostal: { type: String, default: '' },
    ville: { type: String, default: '' },
    pays: { type: String, default: 'France' },
  },
  { _id: false }
);

const clientSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    entreprise: { type: String, trim: true, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true },
    telephone: { type: String, trim: true, default: '' },
    adresse: { type: adresseSchema, default: () => ({}) },
  },
  { timestamps: true }
);

clientSchema.index({ nom: 'text', prenom: 'text', entreprise: 'text', email: 'text' });

module.exports = model('Client', clientSchema);
