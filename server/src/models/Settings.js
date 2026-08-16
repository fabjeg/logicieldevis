const { Schema, model } = require('mongoose');

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
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
  },
  { timestamps: true }
);

settingsSchema.statics.getForUser = async function (userId) {
  let doc = await this.findOne({ userId });
  if (!doc) doc = await this.create({ userId });
  return doc;
};

module.exports = model('Settings', settingsSchema);
