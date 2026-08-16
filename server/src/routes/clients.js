const router = require('express').Router();
const Client = require('../models/Client');

router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user.id };
    if (q) filter.$text = { $search: q };
    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit)),
      Client.countDocuments(filter),
    ]);
    res.json({ clients, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, userId: req.user.id });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
    if (!client) return res.status(404).json({ message: 'Client introuvable' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nom, prenom, entreprise, email, telephone, adresse } = req.body;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { nom, prenom, entreprise, email, telephone, adresse },
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ message: 'Client introuvable' });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!client) return res.status(404).json({ message: 'Client introuvable' });
    res.json({ message: 'Client supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
