const router = require('express').Router();
const Note = require('../models/Note');

// ── Liste ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { userId: req.user.id };
    if (q) {
      const re = { $regex: q, $options: 'i' };
      filter.$or = [{ clientNom: re }, { contenu: re }];
    }
    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Créer ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { clientId, clientNom, contenu } = req.body;
    const note = await Note.create({
      userId: req.user.id,
      clientId: clientId || undefined,
      clientNom: clientNom || '',
      contenu: contenu || '',
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Détail ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note introuvable' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Modifier ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { clientId, clientNom, contenu } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { clientId: clientId || undefined, clientNom: clientNom || '', contenu: contenu || '' },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'Note introuvable' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Supprimer ────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note introuvable' });
    res.json({ message: 'Note supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
