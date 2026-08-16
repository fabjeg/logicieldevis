import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const LIGNE_VIDE = { description: '', quantite: 1, prixUnitaireHT: 0 };
const CLIENT_VIDE = { prenom: '', nom: '', entreprise: '', email: '', telephone: '' };
const NOTES_DEFAUT = '';
const TVA_DEFAUT = 20;

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const cls =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
    <div className="p-4 md:p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span>⚡</span> Devis rapide
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Créez un brouillon en quelques secondes chez le client. Vous compléterez les détails (dates, notes…) plus tard depuis « Modifier ».
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setClientMode('nouveau')}
              className={`py-2.5 rounded-lg text-sm font-medium border ${
                clientMode === 'nouveau'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Nouveau client
            </button>
            <button
              type="button"
              onClick={() => setClientMode('existant')}
              className={`py-2.5 rounded-lg text-sm font-medium border ${
                clientMode === 'existant'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Client existant
            </button>
          </div>

          {clientMode === 'nouveau' ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Prénom *"
                  className={cls}
                  value={nouveauClient.prenom}
                  onChange={(e) => setNouveauClient((c) => ({ ...c, prenom: e.target.value }))}
                />
                <input
                  required
                  placeholder="Nom *"
                  className={cls}
                  value={nouveauClient.nom}
                  onChange={(e) => setNouveauClient((c) => ({ ...c, nom: e.target.value }))}
                />
              </div>
              <input
                type="tel"
                placeholder="Téléphone"
                className={cls}
                value={nouveauClient.telephone}
                onChange={(e) => setNouveauClient((c) => ({ ...c, telephone: e.target.value }))}
              />
              <input
                required
                type="email"
                placeholder="Email *"
                className={cls}
                value={nouveauClient.email}
                onChange={(e) => setNouveauClient((c) => ({ ...c, email: e.target.value }))}
              />
              <input
                placeholder="Entreprise (optionnel)"
                className={cls}
                value={nouveauClient.entreprise}
                onChange={(e) => setNouveauClient((c) => ({ ...c, entreprise: e.target.value }))}
              />
            </div>
          ) : clientSelectionne ? (
            <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {clientSelectionne.prenom} {clientSelectionne.nom}
                </p>
                <p className="text-xs text-gray-500">{clientSelectionne.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { setClientSelectionne(null); setSearch(''); }}
                className="text-xs text-indigo-600 hover:underline flex-shrink-0"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="relative pt-1">
              <input
                type="search"
                placeholder="Rechercher par nom, email…"
                className={cls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim().length >= 2 && (
                <div className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden max-h-56 overflow-y-auto">
                  {recherche ? (
                    <p className="px-3 py-2.5 text-sm text-gray-400">Recherche…</p>
                  ) : resultats.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-gray-400">Aucun client trouvé</p>
                  ) : (
                    resultats.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => { setClientSelectionne(c); setSearch(''); setResultats([]); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-800">{c.prenom} {c.nom}</span>
                        {c.entreprise && <span className="text-gray-400"> · {c.entreprise}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lignes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prestations</h2>
            <button type="button" onClick={ajouterLigne} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Ajouter
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {lignes.map((l, i) => (
              <div key={i} className="p-4 space-y-2.5">
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    placeholder="Description de la prestation"
                    value={l.description}
                    onChange={setLigne(i, 'description')}
                    className={`flex-1 resize-y ${cls}`}
                  />
                  {lignes.length > 1 && (
                    <button type="button" onClick={() => supprimerLigne(i)}
                      className="text-red-400 hover:text-red-600 text-xl leading-none mt-1 w-8 h-8 flex items-center justify-center flex-shrink-0">
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Quantité</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={l.quantite}
                      onChange={setLigne(i, 'quantite')} className={`${cls} text-right`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Prix unitaire HT (€)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={l.prixUnitaireHT}
                      onChange={setLigne(i, 'prixUnitaireHT')} className={`${cls} text-right`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm space-x-4">
            <span className="text-gray-500">Total HT <strong className="text-gray-800">{euros(totaux.totalHT)}</strong></span>
            <span className="text-gray-400">≈ TTC (TVA {TVA_DEFAUT}%) <strong className="text-gray-600">{euros(totaux.totalTTC)}</strong></span>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-lg text-base">
          {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
        </button>
      </form>
    </div>
  );
}
