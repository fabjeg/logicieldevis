/**
 * Migration : rattache le document Settings singleton existant à Corentin
 * (compte principal), puis supprime l'ancien index _singleton.
 *
 * Usage : node src/scripts/migrateSettingsToUsers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Settings = require('../models/Settings');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connecté à MongoDB');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@monentreprise.fr';
  const corentin = await User.findOne({ email: adminEmail });
  if (!corentin) {
    console.error(`Utilisateur admin introuvable (${adminEmail})`);
    process.exit(1);
  }

  const collection = mongoose.connection.db.collection('settings');

  const ancien = await collection.findOne({ _singleton: true });
  if (ancien) {
    await collection.updateOne(
      { _id: ancien._id },
      { $set: { userId: corentin._id }, $unset: { _singleton: '' } }
    );
    console.log(`✅ Settings existant rattaché à Corentin (${corentin.email})`);
  } else {
    console.log('Aucun document _singleton trouvé, rien à migrer.');
  }

  try {
    await collection.dropIndex('_singleton_1');
    console.log('✅ Ancien index _singleton_1 supprimé');
  } catch (err) {
    console.log(`Index _singleton_1 non supprimé (${err.message})`);
  }

  await Settings.syncIndexes();
  console.log('✅ Index synchronisés pour le nouveau schéma (userId unique)');

  await mongoose.disconnect();
  console.log('\nMigration terminée.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
