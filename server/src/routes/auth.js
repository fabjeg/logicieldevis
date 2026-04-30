const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }
  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ message: 'Identifiants incorrects' });
  }

  // Priorité : hash en base > hash en .env > mot de passe en clair .env
  const Settings = require('../models/Settings');
  const settings = await Settings.getSingleton();
  const hash = settings.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH;
  const valid = hash
    ? await bcrypt.compare(password, hash)
    : password === process.env.ADMIN_PASSWORD;

  if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

  const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ token });
});

router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Les deux champs sont requis' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
  }

  const Settings = require('../models/Settings');
  const settings = await Settings.getSingleton();
  const hash = settings.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH;
  const valid = hash
    ? await bcrypt.compare(currentPassword, hash)
    : currentPassword === process.env.ADMIN_PASSWORD;

  if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

  settings.adminPasswordHash = await bcrypt.hash(newPassword, 10);
  await settings.save();
  process.env.ADMIN_PASSWORD_HASH = settings.adminPasswordHash;

  res.json({ message: 'Mot de passe modifié avec succès' });
});

module.exports = router;
