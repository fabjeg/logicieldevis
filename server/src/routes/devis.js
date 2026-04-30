const router = require('express').Router();
const Devis = require('../models/Devis');
const Client = require('../models/Client');
const Settings = require('../models/Settings');
const { genererPDF } = require('../utils/pdfGenerator');

// ── Stats dashboard ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const parStatut = await Devis.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 }, totalTTC: { $sum: '$totalTTC' } } },
    ]);

    const douzeAvant = new Date();
    douzeAvant.setMonth(douzeAvant.getMonth() - 11);
    douzeAvant.setDate(1);
    douzeAvant.setHours(0, 0, 0, 0);

    const caMensuel = await Devis.aggregate([
      { $match: { statut: 'accepté', dateCreation: { $gte: douzeAvant } } },
      {
        $group: {
          _id: { annee: { $year: '$dateCreation' }, mois: { $month: '$dateCreation' } },
          totalTTC: { $sum: '$totalTTC' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.annee': 1, '_id.mois': 1 } },
    ]);

    res.json({ parStatut, caMensuel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Liste avec recherche et filtres ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { statut, clientId, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (statut) filter.statut = statut;
    if (clientId) filter.client = clientId;
    if (q) {
      const re = { $regex: q, $options: 'i' };
      filter.$or = [
        { numero: re },
        { 'snapshotClient.nom': re },
        { 'snapshotClient.prenom': re },
        { 'snapshotClient.entreprise': re },
      ];
    }

    const [devis, total] = await Promise.all([
      Devis.find(filter)
        .populate('client', 'nom prenom entreprise email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit)),
      Devis.countDocuments(filter),
    ]);

    res.json({ devis, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Créer ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { clientId, dateExpiration, statut, lignes, notes, conditionsGenerales, acompte } = req.body;

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: 'Client introuvable' });

    const snapshotClient = {
      nom: client.nom,
      prenom: client.prenom,
      entreprise: client.entreprise,
      email: client.email,
      telephone: client.telephone,
      adresse: client.adresse?.toObject?.() ?? client.adresse,
    };

    const devis = await Devis.create({
      client: clientId,
      snapshotClient,
      dateExpiration: dateExpiration || null,
      statut: statut || 'brouillon',
      lignes: lignes || [],
      notes: notes || '',
      conditionsGenerales: conditionsGenerales || '',
      acompte: acompte || 0,
    });

    res.status(201).json(devis);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Dupliquer ────────────────────────────────────────────────────────────────
router.post('/:id/dupliquer', async (req, res) => {
  try {
    const original = await Devis.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Devis introuvable' });

    const copie = await Devis.create({
      client: original.client,
      snapshotClient: original.snapshotClient,
      dateExpiration: null,
      statut: 'brouillon',
      lignes: original.lignes,
      notes: original.notes,
      conditionsGenerales: original.conditionsGenerales,
    });

    res.status(201).json(copie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Détail ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const devis = await Devis.findById(req.params.id).populate('client');
    if (!devis) return res.status(404).json({ message: 'Devis introuvable' });
    res.json(devis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Modifier ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const devis = await Devis.findById(req.params.id);
    if (!devis) return res.status(404).json({ message: 'Devis introuvable' });

    const { clientId, dateExpiration, statut, lignes, notes, conditionsGenerales, acompte } = req.body;

    if (clientId && String(clientId) !== String(devis.client)) {
      const client = await Client.findById(clientId);
      if (!client) return res.status(404).json({ message: 'Client introuvable' });
      devis.client = clientId;
      devis.snapshotClient = {
        nom: client.nom, prenom: client.prenom, entreprise: client.entreprise,
        email: client.email, telephone: client.telephone,
        adresse: client.adresse?.toObject?.() ?? client.adresse,
      };
    }

    if (dateExpiration !== undefined) devis.dateExpiration = dateExpiration || null;
    if (statut !== undefined) devis.statut = statut;
    if (lignes !== undefined) devis.lignes = lignes;
    if (notes !== undefined) devis.notes = notes;
    if (conditionsGenerales !== undefined) devis.conditionsGenerales = conditionsGenerales;
    if (acompte !== undefined) devis.acompte = acompte;

    await devis.save();
    res.json(devis);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Supprimer ────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const devis = await Devis.findByIdAndDelete(req.params.id);
    if (!devis) return res.status(404).json({ message: 'Devis introuvable' });
    res.json({ message: 'Devis supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Export PDF ───────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const [devis, settings] = await Promise.all([
      Devis.findById(req.params.id),
      Settings.getSingleton(),
    ]);
    if (!devis) return res.status(404).json({ message: 'Devis introuvable' });

    const filename = `${devis.numero || 'brouillon'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    genererPDF(devis, settings, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
