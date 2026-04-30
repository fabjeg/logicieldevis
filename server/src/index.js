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

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/logicieldevis';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connecté');
    app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
  })
  .catch((err) => {
    console.error('Erreur MongoDB :', err.message);
    process.exit(1);
  });
