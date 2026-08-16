const { Schema, model } = require('mongoose');

const snapshotClientSchema = new Schema(
  {
    nom: String,
    prenom: String,
    entreprise: String,
    email: String,
    telephone: String,
    adresse: { rue: String, codePostal: String, ville: String, pays: String },
  },
  { _id: false }
);

const ligneSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantite: { type: Number, required: true, min: 0 },
    prixUnitaireHT: { type: Number, required: true, min: 0 },
    tauxTVA: { type: Number, required: true, default: 20, min: 0, max: 100 },
    prixProHT: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const devisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    numero: { type: String },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    snapshotClient: { type: snapshotClientSchema },
    dateCreation: { type: Date, default: Date.now },
    dateExpiration: { type: Date },
    statut: {
      type: String,
      enum: ['brouillon', 'envoyé', 'accepté', 'refusé'],
      default: 'brouillon',
    },
    lignes: { type: [ligneSchema], default: [] },
    notes: { type: String, default: '' },
    conditionsGenerales: { type: String, default: '' },
    totalHT: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    acompte: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function calculerTotaux(lignes) {
  let totalHT = 0;
  let totalTVA = 0;
  for (const l of lignes) {
    const ht = (l.quantite || 0) * (l.prixUnitaireHT || 0);
    totalHT += ht;
    totalTVA += ht * ((l.tauxTVA || 0) / 100);
  }
  return {
    totalHT: Math.round(totalHT * 100) / 100,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

async function genererNumero(prefixe = 'DEV', userId) {
  const annee = new Date().getFullYear();
  const pattern = `${prefixe}-${annee}-`;

  const dernier = await model('Devis')
    .findOne({ userId, numero: { $regex: `^${pattern.replace('-', '\\-')}` } })
    .sort({ numero: -1 })
    .select('numero')
    .lean();

  let seq = 1;
  if (dernier) {
    const parts = dernier.numero.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${pattern}${String(seq).padStart(3, '0')}`;
}

devisSchema.pre('save', async function (next) {
  const sortDuBrouillon = this.isModified('statut') && this.statut !== 'brouillon';
  if (!this.numero && sortDuBrouillon) {
    const Settings = require('./Settings');
    const settings = await Settings.getForUser(this.userId);
    this.numero = await genererNumero(settings.prefixeNumero || 'DEV', this.userId);
  }

  if (this.isModified('lignes') || this.isNew) {
    const totaux = calculerTotaux(this.lignes);
    this.totalHT = totaux.totalHT;
    this.totalTVA = totaux.totalTVA;
    this.totalTTC = totaux.totalTTC;
  }

  next();
});

devisSchema.index(
  { userId: 1, numero: 1 },
  { unique: true, partialFilterExpression: { numero: { $type: 'string' } } }
);
devisSchema.index({ statut: 1 });
devisSchema.index({ dateCreation: -1 });
devisSchema.index({ client: 1 });

module.exports = model('Devis', devisSchema);
