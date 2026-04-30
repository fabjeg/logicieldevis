require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

const auth = require('./middleware/auth');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', auth, require('./routes/clients'));
app.use('/api/devis', auth, require('./routes/devis'));
app.use('/api/settings', auth, require('./routes/settings'));

// Connexion MongoDB avec cache (important pour Vercel serverless)
let connected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/logicieldevis')
  .then(() => { connected = true; console.log('MongoDB connecté'); })
  .catch((err) => console.error('Erreur MongoDB :', err.message));

// Export pour Vercel
module.exports = app;

// Démarrage local uniquement
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
}
