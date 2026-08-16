const router = require('express').Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getForUser(req.user.id);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const settings = await Settings.getForUser(req.user.id);
    const { entreprise, logo, mentionsLegalesDefaut, prefixeNumero, delaiExpirationDefaut } = req.body;
    if (entreprise !== undefined) settings.entreprise = entreprise;
    if (logo !== undefined) settings.logo = logo;
    if (mentionsLegalesDefaut !== undefined) settings.mentionsLegalesDefaut = mentionsLegalesDefaut;
    if (prefixeNumero !== undefined) settings.prefixeNumero = prefixeNumero;
    if (delaiExpirationDefaut !== undefined) settings.delaiExpirationDefaut = delaiExpirationDefaut;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
