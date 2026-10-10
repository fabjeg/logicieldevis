const PDFDocument = require('pdfkit');

const BLUE = '#1e40af';
const GRAY = '#374151';
const LIGHT_GRAY = '#f8fafc';
const BORDER = '#e2e8f0';
const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;
const USABLE_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 80;

const COL = { num: 50, desc: 75, qty: 335, pu: 400, total: 485 };

const CONDITIONS_DEFAUT =
  'Les prix sont établis sur la base des tarifs matériaux en vigueur à la date du devis. ' +
  'En cas de hausse de ces derniers, nous nous réservons le droit de facturer un supplément correspondant';

function euros(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n || 0)
    .replace(/[  ]/g, ' ');
}

function datesFR(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function dessinerEnteteTableau(doc, y) {
  doc.rect(MARGIN, y, USABLE_W, 22).fill(BLUE);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('#', COL.num, y + 7, { width: 20, align: 'center' });
  doc.text('Description', COL.desc, y + 7, { width: 255 });
  doc.text('Qté', COL.qty, y + 7, { width: 50, align: 'right' });
  doc.text('PU', COL.pu, y + 7, { width: 65, align: 'right' });
  doc.text('Total', COL.total, y + 7, { width: 60, align: 'right' });
  return y + 22;
}

function genererPDF(devis, settings, stream) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  doc.pipe(stream);

  const ent = settings.entreprise || {};
  const snap = devis.snapshotClient || {};
  const addrEnt = ent.adresse || {};

  // ── En-tête entreprise ────────────────────────────────────────────────────
  doc.fontSize(16).font('Helvetica-Bold').fillColor(BLUE).text(ent.nom || 'Mon Entreprise', MARGIN, 50);
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);

  const lignesEnt = [
    addrEnt.rue,
    [addrEnt.codePostal, addrEnt.ville].filter(Boolean).join(' '),
    addrEnt.pays && addrEnt.pays !== 'France' ? addrEnt.pays : null,
    ent.email,
    ent.telephone,
    ent.siret ? `SIRET : ${ent.siret}` : null,
  ].filter(Boolean);
  lignesEnt.forEach((l) => doc.text(l));

  if (settings.logo && settings.logo.startsWith('data:image')) {
    try { doc.image(settings.logo, PAGE_W - MARGIN - 120, 50, { fit: [120, 80] }); } catch (_) {}
  }

  const ySep = Math.max(doc.y + 12, 135);
  doc.moveTo(MARGIN, ySep).lineTo(PAGE_W - MARGIN, ySep).strokeColor(BORDER).lineWidth(1).stroke();

  // ── Titre + infos devis ───────────────────────────────────────────────────
  let y = ySep + 18;

  // "Devis CESU" en titre principal
  doc.fontSize(22).font('Helvetica-Bold').fillColor(BLUE)
    .text('Devis CESU', MARGIN, y, { align: 'right', width: USABLE_W });

  // Numéro + dates en dessous
  doc.fontSize(10).font('Helvetica-Bold').fillColor(GRAY)
    .text(devis.numero ? `N° ${devis.numero}` : '(brouillon)', MARGIN, doc.y + 2, {
      align: 'right', width: USABLE_W,
    });
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);
  doc.text(`Date d'émission : ${datesFR(devis.dateCreation)}`, MARGIN, doc.y + 2, { align: 'right', width: USABLE_W });
  if (devis.dateExpiration) {
    doc.text(`Valable jusqu'au : ${datesFR(devis.dateExpiration)}`, { align: 'right', width: USABLE_W });
  }

  // ── Destinataire ──────────────────────────────────────────────────────────
  const hClient = 90;
  doc.rect(MARGIN, y, 230, hClient).fillAndStroke(LIGHT_GRAY, BORDER);
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#6b7280').text('DESTINATAIRE', MARGIN + 10, y + 8);
  const nomClient = [snap.prenom, snap.nom].filter(Boolean).join(' ') || '—';
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text(nomClient, MARGIN + 10, y + 20);
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);
  if (snap.entreprise) doc.text(snap.entreprise);
  const addrSnap = snap.adresse || {};
  if (addrSnap.rue) doc.text(addrSnap.rue);
  const cpVille = [addrSnap.codePostal, addrSnap.ville].filter(Boolean).join(' ');
  if (cpVille) doc.text(cpVille);
  if (snap.email) doc.text(snap.email);
  if (snap.telephone) doc.text(snap.telephone);

  // ── Description des travaux effectués ─────────────────────────────────────
  y = y + hClient + 20;
  if (devis.descriptionTravaux) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLUE)
      .text('Description des travaux effectués', MARGIN, y);
    y = doc.y + 4;
    doc.fontSize(8.5).font('Helvetica').fillColor(GRAY)
      .text(devis.descriptionTravaux, MARGIN, y, { width: USABLE_W });
    y = doc.y + 16;
    if (y + 60 > BOTTOM_LIMIT) { doc.addPage(); y = MARGIN; }
  }

  // ── Tableau des lignes avec gestion de page ───────────────────────────────
  y = dessinerEnteteTableau(doc, y);

  let ligneIndex = 0;
  for (const ligne of devis.lignes) {
    const descText = ligne.description || '';
    doc.fontSize(8.5).font('Helvetica');
    const descHeight = doc.heightOfString(descText, { width: 255 });
    const rowHeight = Math.max(20, descHeight + 12);

    if (y + rowHeight > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
      y = dessinerEnteteTableau(doc, y);
    }

    const bg = ligneIndex % 2 === 0 ? '#ffffff' : LIGHT_GRAY;
    const totalLigne = (ligne.quantite || 0) * (ligne.prixUnitaireHT || 0);

    doc.rect(MARGIN, y, USABLE_W, rowHeight).fill(bg);
    doc.fillColor('#111827');
    doc.text(String(ligneIndex + 1), COL.num, y + 6, { width: 20, align: 'center' });
    doc.text(descText, COL.desc, y + 6, { width: 255 });
    doc.text(String(ligne.quantite ?? ''), COL.qty, y + 6, { width: 50, align: 'right' });
    doc.text(euros(ligne.prixUnitaireHT), COL.pu, y + 6, { width: 65, align: 'right' });
    doc.text(euros(totalLigne), COL.total, y + 6, { width: 60, align: 'right' });

    y += rowHeight;
    ligneIndex++;
  }

  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(BORDER).lineWidth(1).stroke();

  // ── Totaux ────────────────────────────────────────────────────────────────
  y += 12;
  if (y + 80 > BOTTOM_LIMIT) { doc.addPage(); y = MARGIN; }

  const drawRow = (label, valeur, highlight = false) => {
    if (highlight) {
      doc.rect(360, y - 3, 185, 22).fill(BLUE);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    } else {
      doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);
    }
    doc.text(label, 360, y, { width: 120, align: 'right' });
    doc.text(valeur, 490, y, { width: 55, align: 'right' });
    if (highlight) doc.fillColor('#111827');
    y += highlight ? 22 : 17;
  };

  drawRow('Total TTC :', euros(devis.totalTTC), true);

  // Acompte et reste à payer
  if (devis.acompte > 0) {
    const solde = Math.round((devis.totalTTC - devis.acompte) * 100) / 100;
    drawRow('Acompte à verser :', euros(devis.acompte));
    drawRow('Solde à la livraison :', euros(solde), true);
  }

  // ── Récapitulatif à titre indicatif (sur la main d'œuvre) ─────────────────
  if (devis.recapCesu && devis.recapCesu.length > 0) {
    y += 18;
    if (y + 20 + devis.recapCesu.length * 15 > BOTTOM_LIMIT) { doc.addPage(); y = MARGIN; }
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY)
      .text("À titre indicatif (sur la main d'œuvre) :", 250, y, { width: 295, align: 'right' });
    y = doc.y + 5;
    devis.recapCesu.forEach((item) => {
      doc.fontSize(8.5).font('Helvetica').fillColor(GRAY)
        .text(item.libelle || '', 250, y, { width: 235, align: 'right' });
      doc.font('Helvetica-Bold').fillColor('#111827')
        .text(euros(item.montant), 490, y, { width: 55, align: 'right' });
      y += 15;
    });
    y += 6;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  y += 18;
  if (devis.notes) {
    if (y + 40 > BOTTOM_LIMIT) { doc.addPage(); y = MARGIN; }
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY).text('Notes :', MARGIN, y);
    y = doc.y + 3;
    doc.font('Helvetica').fillColor(GRAY).text(devis.notes, MARGIN, y, { width: USABLE_W });
    y = doc.y + 12;
  }

  // ── Conditions générales (toujours présentes) ─────────────────────────────
  {
    const conditions = devis.conditionsGenerales || CONDITIONS_DEFAUT;
    if (y + 40 > BOTTOM_LIMIT) { doc.addPage(); y = MARGIN; }
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY).text('Conditions générales :', MARGIN, y);
    y = doc.y + 3;
    doc.font('Helvetica').fillColor('#6b7280').text(conditions, MARGIN, y, { width: USABLE_W });
    y = doc.y + 18;
  }

  // ── Zone de signature ─────────────────────────────────────────────────────
  const ySign = Math.max(y + 10, PAGE_H - 200);
  if (ySign + 80 > PAGE_H - 50) { doc.addPage(); }
  const ySignFinal = doc.page.height - 180;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('Bon pour accord', MARGIN, ySignFinal);
  doc.rect(MARGIN, ySignFinal + 14, 220, 60).strokeColor(BORDER).lineWidth(1).stroke();
  doc.fontSize(7.5).font('Helvetica').fillColor('#9ca3af')
    .text('Date et signature du client', MARGIN + 6, ySignFinal + 18);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY)
    .text('Cachet et signature', MARGIN + 280, ySignFinal);
  doc.rect(MARGIN + 280, ySignFinal + 14, 220, 60).strokeColor(BORDER).lineWidth(1).stroke();

  // ── Mentions légales ──────────────────────────────────────────────────────
  if (settings.mentionsLegalesDefaut) {
    doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
      .text(settings.mentionsLegalesDefaut, MARGIN, PAGE_H - 65, {
        width: USABLE_W, align: 'center',
      });
  }

  doc.end();
}

module.exports = { genererPDF };
