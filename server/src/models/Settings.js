const { Schema, model } = require('mongoose');

const settingsSchema = new Schema(
  {
    _singleton: { type: Boolean, default: true, unique: true },
    entreprise: {
      nom: { type: String, default: '' },
      adresse: {
        rue: { type: String, default: '' },
        codePostal: { type: String, default: '' },
        ville: { type: String, default: '' },
        pays: { type: String, default: 'France' },
      },
      email: { type: String, default: '' },
      telephone: { type: String, default: '' },
      siret: { type: String, default: '' },
    },
    logo: { type: String, default: '' },
    mentionsLegalesDefaut: { type: String, default: '' },
    prefixeNumero: { type: String, default: 'DEV' },
    delaiExpirationDefaut: { type: Number, default: 30 },
    adminPasswordHash: { type: String, default: '' },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ _singleton: true });
  if (!doc) doc = await this.create({ _singleton: true });
  return doc;
};

module.exports = model('Settings', settingsSchema);
