import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const LIGNE_VIDE = { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 };
const NOTES_DEFAUT = `travaux effectué en CESU.\nà titre indicatif:\nsalaire net versé au salarié: 690€\nCotisations sociales prélevées à l'employeur: 547.04€\nAvantage fiscal pour l'employeur: 618.52€\nCoût réel pour l'employeur: 618.52€\nsur la mains d'œuvre`;
const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'];

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const fieldCard = 'block bg-surface rounded-field px-4 py-2.5 shadow-soft';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1';
const inputCls = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:ring-0';
const chipField = 'bg-page rounded-[12px] px-3 py-2';
const chipLabel = 'block text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5';
const chipInput = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink text-right focus:outline-none';
const sectionLabel = 'px-1 text-[11px] font-bold uppercase tracking-wide text-muted';

export default function DevisForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    dateExpiration: '',
    statut: 'brouillon',
    lignes: [{ ...LIGNE_VIDE }],
    notes: NOTES_DEFAUT,
    conditionsGenerales: '',
    acompte: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reqs = [api.get('/clients?limit=200'), api.get('/settings')];
    if (isEdit) reqs.push(api.get(`/devis/${id}`));

    Promise.all(reqs).then(([clientsRes, settingsRes, devisRes]) => {
      setClients(clientsRes.data.clients);
      const s = settingsRes.data;

      if (isEdit && devisRes) {
        const d = devisRes.data;
        setForm({
          clientId: String(d.client?._id || d.client || ''),
          dateExpiration: d.dateExpiration ? d.dateExpiration.slice(0, 10) : '',
          statut: d.statut,
          lignes: d.lignes.length > 0 ? d.lignes : [{ ...LIGNE_VIDE }],
          notes: d.notes || '',
          conditionsGenerales: d.conditionsGenerales || '',
          acompte: d.acompte || 0,
        });
      } else {
        // Pré-remplir expiration et conditions depuis les paramètres
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (s.delaiExpirationDefaut || 30));
        setForm((f) => ({
          ...f,
          dateExpiration: expDate.toISOString().slice(0, 10),
          conditionsGenerales: s.mentionsLegalesDefaut || '',
        }));
      }
    });
  }, [id, isEdit]);

  const totaux = useMemo(() => {
    let totalHT = 0;
    let totalTVA = 0;
    for (const l of form.lignes) {
      const ht = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
      totalHT += ht;
      totalTVA += ht * ((Number(l.tauxTVA) || 0) / 100);
    }
    return {
      totalHT: Math.round(totalHT * 100) / 100,
      totalTVA: Math.round(totalTVA * 100) / 100,
      totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
    };
  }, [form.lignes]);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const setLigne = (i, field) => (e) =>
    setForm((f) => {
      const lignes = [...f.lignes];
      lignes[i] = { ...lignes[i], [field]: e.target.value };
      return { ...f, lignes };
    });

  const ajouterLigne = () =>
    setForm((f) => ({ ...f, lignes: [...f.lignes, { ...LIGNE_VIDE }] }));

  const supprimerLigne = (i) =>
    setForm((f) => ({ ...f, lignes: f.lignes.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Veuillez sélectionner un client'); return; }
    if (form.lignes.length === 0) { toast.error('Ajoutez au moins une ligne'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        lignes: form.lignes.map((l) => ({
          ...l,
          quantite: Number(l.quantite),
          prixUnitaireHT: Number(l.prixUnitaireHT),
          tauxTVA: Number(l.tauxTVA),
        })),
      };
      if (isEdit) {
        await api.put(`/devis/${id}`, payload);
        toast.success('Devis mis à jour');
      } else {
        await api.post('/devis', payload);
        toast.success('Devis créé');
      }
      navigate('/devis');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-[22px] font-extrabold tracking-tightest text-ink px-1 pt-1">
        {isEdit ? 'Modifier le devis' : 'Nouveau devis'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Infos générales */}
        <div className="space-y-3">
          <p className={sectionLabel}>Informations</p>
          <label className={fieldCard}>
            <span className={labelCls}>Client *</span>
            <select required value={form.clientId} onChange={setField('clientId')} className={inputCls}>
              <option value="">Sélectionner un client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.prenom} {c.nom}{c.entreprise ? ` · ${c.entreprise}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={fieldCard}>
              <span className={labelCls}>Statut</span>
              <select value={form.statut} onChange={setField('statut')} className={inputCls}>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className={fieldCard}>
              <span className={labelCls}>Expiration</span>
              <input type="date" value={form.dateExpiration} onChange={setField('dateExpiration')} className={inputCls} />
            </label>
          </div>
        </div>

        {/* Lignes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className={sectionLabel}>Lignes</p>
            <button type="button" onClick={ajouterLigne} className="text-sm font-semibold text-accent">
              + Ajouter
            </button>
          </div>

          {form.lignes.map((l, i) => {
            const totalLigne = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
            return (
              <div key={i} className="bg-surface rounded-card shadow-soft p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <textarea
                    required
                    rows={2}
                    value={l.description}
                    onChange={setLigne(i, 'description')}
                    placeholder="Description du produit / service"
                    className="flex-1 resize-y bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none"
                  />
                  {form.lignes.length > 1 && (
                    <button type="button" onClick={() => supprimerLigne(i)}
                      className="text-faint hover:text-danger text-xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0">
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className={chipField}>
                    <span className={chipLabel}>Qté</span>
                    <input type="number" min="0" step="0.01" value={l.quantite} onChange={setLigne(i, 'quantite')} className={chipInput} />
                  </div>
                  <div className={chipField}>
                    <span className={chipLabel}>PU HT (€)</span>
                    <input type="number" min="0" step="0.01" value={l.prixUnitaireHT} onChange={setLigne(i, 'prixUnitaireHT')} className={chipInput} />
                  </div>
                  <div className={chipField}>
                    <span className={chipLabel}>TVA %</span>
                    <input type="number" min="0" max="100" step="0.1" value={l.tauxTVA} onChange={setLigne(i, 'tauxTVA')} className={chipInput} />
                  </div>
                </div>
                <p className="text-right text-sm font-semibold text-ink tnum">Total HT : {euros(totalLigne)}</p>
              </div>
            );
          })}
        </div>

        {/* Totaux */}
        <div className="bg-surface rounded-card shadow-soft p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Total HT</span>
            <span className="font-semibold text-ink tnum">{euros(totaux.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">TVA</span>
            <span className="font-semibold text-ink tnum">{euros(totaux.totalTVA)}</span>
          </div>
          <div className="flex justify-between pt-2.5 border-t border-page items-center">
            <span className="text-sm font-semibold text-ink">Total TTC</span>
            <span className="text-lg font-extrabold text-accent tnum">{euros(totaux.totalTTC)}</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-page gap-3">
            <span className="text-sm text-muted whitespace-nowrap">Acompte à verser (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.acompte}
              onChange={(e) => setForm((f) => ({ ...f, acompte: Number(e.target.value) }))}
              className="w-28 bg-page rounded-[12px] px-3 py-2 text-sm text-right text-ink focus:outline-none"
            />
          </div>
          {form.acompte > 0 && (
            <div className="flex justify-between font-bold text-accent bg-accent-soft rounded-[12px] px-3 py-2.5">
              <span>Solde à la livraison</span>
              <span className="tnum">{euros(Math.max(0, totaux.totalTTC - form.acompte))}</span>
            </div>
          )}
        </div>

        {/* Notes & conditions */}
        <div className="space-y-3">
          <p className={sectionLabel}>Notes &amp; Conditions</p>
          <label className={fieldCard}>
            <span className={labelCls}>Notes</span>
            <textarea rows={8} value={form.notes} onChange={setField('notes')}
              placeholder="Informations complémentaires visibles sur le PDF…"
              className={`${inputCls} resize-y`} />
          </label>
          <label className={fieldCard}>
            <span className={labelCls}>Conditions générales</span>
            <textarea rows={4} value={form.conditionsGenerales} onChange={setField('conditionsGenerales')}
              className={`${inputCls} resize-y`} />
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 bg-accent-gradient text-white font-semibold py-3.5 rounded-field shadow-fab active:scale-[0.99] transition-transform disabled:opacity-50">
            {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le devis'}
          </button>
          <button type="button" onClick={() => navigate('/devis')}
            className="px-5 py-3.5 text-sm font-semibold text-muted bg-surface rounded-field shadow-soft">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
