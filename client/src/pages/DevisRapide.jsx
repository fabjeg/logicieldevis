import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const LIGNE_VIDE = { description: '', quantite: 1, prixUnitaireHT: 0 };
const CLIENT_VIDE = { prenom: '', nom: '', entreprise: '', email: '', telephone: '' };
const NOTES_DEFAUT = '';
const TVA_DEFAUT = 20;

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const fieldCard = 'block bg-surface rounded-field px-4 py-2.5 shadow-soft';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1';
const inputCls = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:ring-0';
const chipField = 'bg-page rounded-[12px] px-3 py-2';
const chipLabel = 'block text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5';
const chipInput = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink text-right focus:outline-none';
const sectionLabel = 'px-1 text-[11px] font-bold uppercase tracking-wide text-muted';

export default function DevisRapide() {
  const toast = useToast();

  const [settings, setSettings] = useState(null);
  const [clientMode, setClientMode] = useState('nouveau'); // 'nouveau' | 'existant'
  const [nouveauClient, setNouveauClient] = useState({ ...CLIENT_VIDE });
  const [search, setSearch] = useState('');
  const [resultats, setResultats] = useState([]);
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [recherche, setRecherche] = useState(false);
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }]);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings(data));
  }, []);

  useEffect(() => {
    if (clientMode !== 'existant' || search.trim().length < 2) {
      setResultats([]);
      return;
    }
    setRecherche(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/clients', { params: { q: search.trim(), limit: 8 } });
        setResultats(data.clients);
      } finally {
        setRecherche(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, clientMode]);

  const totaux = useMemo(() => {
    const totalHT = lignes.reduce(
      (s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0),
      0
    );
    return {
      totalHT: Math.round(totalHT * 100) / 100,
      totalTTC: Math.round(totalHT * (1 + TVA_DEFAUT / 100) * 100) / 100,
    };
  }, [lignes]);

  const setLigne = (i, field) => (e) =>
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = { ...copie[i], [field]: e.target.value };
      return copie;
    });
  const ajouterLigne = () => setLignes((ls) => [...ls, { ...LIGNE_VIDE }]);
  const supprimerLigne = (i) => setLignes((ls) => ls.filter((_, idx) => idx !== i));

  const resetFormulaire = () => {
    setClientMode('nouveau');
    setNouveauClient({ ...CLIENT_VIDE });
    setSearch('');
    setResultats([]);
    setClientSelectionne(null);
    setLignes([{ ...LIGNE_VIDE }]);
  };

  const validerClient = () => {
    if (clientMode === 'existant') return Boolean(clientSelectionne);
    return Boolean(nouveauClient.prenom.trim() && nouveauClient.nom.trim() && nouveauClient.email.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validerClient()) {
      toast.error('Renseignez au moins le prénom, nom et email du client');
      return;
    }
    const lignesValides = lignes.filter((l) => l.description.trim() !== '');
    if (lignesValides.length === 0) {
      toast.error('Ajoutez au moins une ligne');
      return;
    }

    setSaving(true);
    try {
      let clientId = clientSelectionne?._id;
      let nomAffiche = clientSelectionne
        ? `${clientSelectionne.prenom} ${clientSelectionne.nom}`
        : '';

      if (clientMode === 'nouveau') {
        const { data: client } = await api.post('/clients', nouveauClient);
        clientId = client._id;
        nomAffiche = `${client.prenom} ${client.nom}`;
      }

      const dateExpiration = new Date();
      dateExpiration.setDate(dateExpiration.getDate() + (settings?.delaiExpirationDefaut || 30));

      await api.post('/devis', {
        clientId,
        statut: 'brouillon',
        dateExpiration: dateExpiration.toISOString().slice(0, 10),
        lignes: lignesValides.map((l) => ({
          description: l.description,
          quantite: Number(l.quantite) || 0,
          prixUnitaireHT: Number(l.prixUnitaireHT) || 0,
          tauxTVA: TVA_DEFAUT,
        })),
        notes: NOTES_DEFAUT,
        conditionsGenerales: settings?.mentionsLegalesDefaut || '',
      });

      toast.success(`Brouillon enregistré pour ${nomAffiche}`);
      resetFormulaire();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="px-1 pt-1">
        <h1 className="text-[22px] font-extrabold tracking-tightest text-ink flex items-center gap-2">
          <span className="text-accent">⚡</span> Devis rapide
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Créez un brouillon en quelques secondes chez le client. Les détails (dates, notes…) se complètent plus tard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client */}
        <div className="space-y-3">
          <p className={sectionLabel}>Client</p>

          {/* Segmented control */}
          <div className="bg-surface rounded-field shadow-soft p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setClientMode('nouveau')}
              className={`flex-1 py-2.5 rounded-[12px] text-sm font-semibold transition-colors ${
                clientMode === 'nouveau' ? 'bg-accent text-white' : 'text-muted'
              }`}
            >
              Nouveau client
            </button>
            <button
              type="button"
              onClick={() => setClientMode('existant')}
              className={`flex-1 py-2.5 rounded-[12px] text-sm font-semibold transition-colors ${
                clientMode === 'existant' ? 'bg-accent text-white' : 'text-muted'
              }`}
            >
              Client existant
            </button>
          </div>

          {clientMode === 'nouveau' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className={fieldCard}>
                  <span className={labelCls}>Prénom *</span>
                  <input required className={inputCls} value={nouveauClient.prenom}
                    onChange={(e) => setNouveauClient((c) => ({ ...c, prenom: e.target.value }))} />
                </label>
                <label className={fieldCard}>
                  <span className={labelCls}>Nom *</span>
                  <input required className={inputCls} value={nouveauClient.nom}
                    onChange={(e) => setNouveauClient((c) => ({ ...c, nom: e.target.value }))} />
                </label>
              </div>
              <label className={fieldCard}>
                <span className={labelCls}>Téléphone</span>
                <input type="tel" className={inputCls} value={nouveauClient.telephone}
                  onChange={(e) => setNouveauClient((c) => ({ ...c, telephone: e.target.value }))} />
              </label>
              <label className={fieldCard}>
                <span className={labelCls}>Email *</span>
                <input required type="email" className={inputCls} value={nouveauClient.email}
                  onChange={(e) => setNouveauClient((c) => ({ ...c, email: e.target.value }))} />
              </label>
              <label className={fieldCard}>
                <span className={labelCls}>Entreprise (optionnel)</span>
                <input className={inputCls} value={nouveauClient.entreprise}
                  onChange={(e) => setNouveauClient((c) => ({ ...c, entreprise: e.target.value }))} />
              </label>
            </div>
          ) : clientSelectionne ? (
            <div className="bg-surface rounded-field shadow-soft flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(clientSelectionne.prenom[0] || '') + (clientSelectionne.nom[0] || '')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {clientSelectionne.prenom} {clientSelectionne.nom}
                </p>
                <p className="text-xs text-muted truncate">{clientSelectionne.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { setClientSelectionne(null); setSearch(''); }}
                className="text-xs font-semibold text-accent flex-shrink-0"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
                </svg>
                <input
                  type="search"
                  placeholder="Rechercher par nom, email…"
                  className="w-full bg-surface rounded-field pl-11 pr-4 py-3 text-sm text-ink placeholder:text-faint shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search.trim().length >= 2 && (
                <div className="mt-2 bg-surface rounded-field shadow-soft overflow-hidden divide-y divide-page max-h-56 overflow-y-auto">
                  {recherche ? (
                    <p className="px-4 py-3 text-sm text-muted">Recherche…</p>
                  ) : resultats.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted">Aucun client trouvé</p>
                  ) : (
                    resultats.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => { setClientSelectionne(c); setSearch(''); setResultats([]); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-page"
                      >
                        <span className="font-semibold text-ink">{c.prenom} {c.nom}</span>
                        {c.entreprise && <span className="text-muted"> · {c.entreprise}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prestations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className={sectionLabel}>Prestations</p>
            <button type="button" onClick={ajouterLigne} className="text-sm font-semibold text-accent">
              + Ajouter
            </button>
          </div>

          {lignes.map((l, i) => (
            <div key={i} className="bg-surface rounded-card shadow-soft p-4 space-y-3">
              <div className="flex items-start gap-2">
                <textarea
                  rows={2}
                  placeholder="Description de la prestation"
                  value={l.description}
                  onChange={setLigne(i, 'description')}
                  className="flex-1 resize-y bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none"
                />
                {lignes.length > 1 && (
                  <button type="button" onClick={() => supprimerLigne(i)}
                    className="text-faint hover:text-danger text-xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0">
                    ×
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={chipField}>
                  <span className={chipLabel}>Quantité</span>
                  <input type="number" inputMode="decimal" min="0" step="0.01" value={l.quantite}
                    onChange={setLigne(i, 'quantite')} className={chipInput} />
                </div>
                <div className={chipField}>
                  <span className={chipLabel}>Prix unitaire HT (€)</span>
                  <input type="number" inputMode="decimal" min="0" step="0.01" value={l.prixUnitaireHT}
                    onChange={setLigne(i, 'prixUnitaireHT')} className={chipInput} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="bg-surface rounded-card shadow-soft p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total HT</span>
            <span className="font-semibold text-ink tnum">{euros(totaux.totalHT)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-page">
            <span className="text-sm font-semibold text-ink">≈ Total TTC <span className="text-muted font-normal">(TVA {TVA_DEFAUT}%)</span></span>
            <span className="text-lg font-extrabold text-accent tnum">{euros(totaux.totalTTC)}</span>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-accent-gradient text-white font-semibold py-3.5 rounded-field shadow-fab active:scale-[0.99] transition-transform disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
        </button>
      </form>
    </div>
  );
}
