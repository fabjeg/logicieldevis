/**
 * Migration : supprime le champ adminPasswordHash (mort, plus dans le
 * schéma) des documents Settings existants. Nécessaire car Mongoose
 * renvoie les champs bruts déjà stockés même s'ils ne sont plus déclarés
 * dans le schéma (findOne non-lean ne les filtre pas automatiquement).
 *
 * Usage : node src/scripts/removeAdminPasswordHash.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connecté à MongoDB');

  const collection = mongoose.connection.db.collection('settings');
  const result = await collection.updateMany(
    { adminPasswordHash: { $exists: true } },
    { $unset: { adminPasswordHash: '' } }
  );
  console.log(`✅ ${result.modifiedCount} document(s) nettoyé(s)`);

  await mongoose.disconnect();
  console.log('Migration terminée.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
