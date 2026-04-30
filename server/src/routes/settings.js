const router = require('express').Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const { entreprise, logo, mentionsLegalesDefaut } = req.body;
    if (entreprise !== undefined) settings.entreprise = entreprise;
    if (logo !== undefined) settings.logo = logo;
    if (mentionsLegalesDefaut !== undefined) settings.mentionsLegalesDefaut = mentionsLegalesDefaut;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
