/**
 * Migration : initialise la collection Counter à partir des numéros de
 * devis existants, pour que le nouveau compteur atomique (genererNumero)
 * reparte après le dernier numéro déjà attribué à chaque utilisateur/année,
 * au lieu de redémarrer à 001 et entrer en collision.
 *
 * Usage : node src/scripts/migrateNumeroCounters.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const Devis = require('../models/Devis');
const Counter = require('../models/Counter');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connecté à MongoDB');

  const devisNumerotes = await Devis.find({ numero: { $type: 'string' } })
    .select('userId numero')
    .lean();

  const maxParCle = new Map();

  for (const d of devisNumerotes) {
    const parts = d.numero.split('-');
    if (parts.length < 2) continue;
    const seq = parseInt(parts[parts.length - 1], 10);
    const annee = parts[parts.length - 2];
    if (!Number.isFinite(seq) || !/^\d{4}$/.test(annee)) continue;

    const cle = `devis-${d.userId}-${annee}`;
    const max = maxParCle.get(cle) || 0;
    if (seq > max) maxParCle.set(cle, seq);
  }

  for (const [cle, seq] of maxParCle) {
    await Counter.findOneAndUpdate(
      { _id: cle },
      { $set: { seq } },
      { upsert: true }
    );
    console.log(`✅ ${cle} → seq=${seq}`);
  }

  console.log(`\n${maxParCle.size} compteur(s) initialisé(s).`);
  await mongoose.disconnect();
  console.log('Migration terminée.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
