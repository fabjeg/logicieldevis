/**
 * Script de migration : crée les comptes Corentin et Guillaume,
 * puis rattache toutes les données existantes à Corentin.
 *
 * Usage : node src/scripts/seedUsers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Client = require('../models/Client');
const Devis = require('../models/Devis');

const USERS = [
  {
    prenom: 'Corentin',
    nom: 'Buhe',
    email: process.env.ADMIN_EMAIL || 'admin@monentreprise.fr',
    password: process.env.ADMIN_PASSWORD || 'motdepasse_dev',
    isMain: true,
  },
  {
    prenom: 'Guillaume',
    nom: 'Buhe',
    email: 'guillaume.buhe@email.fr',
    password: 'Guillaume2024!',
    isMain: false,
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connecté à MongoDB');

  let corentinId = null;

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`✔ Utilisateur existant : ${u.prenom} ${u.nom} (${u.email})`);
      if (u.isMain) corentinId = existing._id;
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 10);
    const created = await User.create({
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      passwordHash,
    });

    console.log(`✅ Créé : ${u.prenom} ${u.nom} (${u.email})  —  mot de passe : ${u.password}`);
    if (u.isMain) corentinId = created._id;
  }

  if (!corentinId) {
    console.error('Impossible de trouver le compte Corentin');
    process.exit(1);
  }

  // Rattacher les clients sans userId à Corentin
  const clientsResult = await Client.updateMany(
    { userId: { $exists: false } },
    { $set: { userId: corentinId } }
  );
  console.log(`\n📋 Clients migrés vers Corentin : ${clientsResult.modifiedCount}`);

  // Rattacher les devis sans userId à Corentin
  const devisResult = await Devis.updateMany(
    { userId: { $exists: false } },
    { $set: { userId: corentinId } }
  );
  console.log(`📄 Devis migrés vers Corentin   : ${devisResult.modifiedCount}`);

  console.log('\nMigration terminée.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
