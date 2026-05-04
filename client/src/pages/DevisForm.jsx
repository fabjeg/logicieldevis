import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const LIGNE_VIDE = { description: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 };
const NOTES_DEFAUT = `travaux effectué en CESU.\nà titre indicatif:\nsalaire net versé au salarié: 690€\nCotisations sociales prélevées à l'employeur: 547.04€\nAvantage fiscal pour l'employeur: 618.52€\nCoût réel pour l'employeur: 618.52€\nsur la mains d'œuvre`;
const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'];

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const cls =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
    <div className="p-4 md:p-6 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {isEdit ? 'Modifier le devis' : 'Nouveau devis'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Infos générales */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select required value={form.clientId} onChange={setField('clientId')} className={`w-full ${cls}`}>
                <option value="">Sélectionner un client…</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.prenom} {c.nom}{c.entreprise ? ` · ${c.entreprise}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select value={form.statut} onChange={setField('statut')} className={`w-full ${cls}`}>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
              <input type="date" value={form.dateExpiration} onChange={setField('dateExpiration')} className={`w-full ${cls}`} />
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lignes</h2>
            <button type="button" onClick={ajouterLigne} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Ajouter
            </button>
          </div>

          {/* Mobile: cartes par ligne */}
          <div className="sm:hidden divide-y divide-gray-100">
            {form.lignes.map((l, i) => {
              const totalLigne = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
              const inputCls = 'w-full border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400';
              return (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <textarea
                      required
                      rows={2}
                      value={l.description}
                      onChange={setLigne(i, 'description')}
                      placeholder="Description du produit / service"
                      className={`flex-1 resize-y ${inputCls}`}
                    />
                    {form.lignes.length > 1 && (
                      <button type="button" onClick={() => supprimerLigne(i)}
                        className="text-red-400 hover:text-red-600 text-xl leading-none mt-1 w-7 h-7 flex items-center justify-center flex-shrink-0">
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Qté</label>
                      <input type="number" min="0" step="0.01" value={l.quantite} onChange={setLigne(i, 'quantite')} className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">PU HT (€)</label>
                      <input type="number" min="0" step="0.01" value={l.prixUnitaireHT} onChange={setLigne(i, 'prixUnitaireHT')} className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">TVA %</label>
                      <input type="number" min="0" max="100" step="0.1" value={l.tauxTVA} onChange={setLigne(i, 'tauxTVA')} className={`${inputCls} text-right`} />
                    </div>
                  </div>
                  <p className="text-right text-sm font-medium text-gray-700">Total HT : {euros(totalLigne)}</p>
                </div>
              );
            })}
          </div>

          {/* Desktop: tableau */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-right px-2 py-2 w-20">Qté</th>
                <th className="text-right px-2 py-2 w-28">PU HT (€)</th>
                <th className="text-right px-2 py-2 w-20">TVA %</th>
                <th className="text-right px-4 py-2 w-28">Total HT</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {form.lignes.map((l, i) => {
                const totalLigne = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-2">
                      <textarea
                        required
                        rows={2}
                        value={l.description}
                        onChange={setLigne(i, 'description')}
                        placeholder="Description du produit / service"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" step="0.01" value={l.quantite} onChange={setLigne(i, 'quantite')}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" step="0.01" value={l.prixUnitaireHT} onChange={setLigne(i, 'prixUnitaireHT')}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max="100" step="0.1" value={l.tauxTVA} onChange={setLigne(i, 'tauxTVA')}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-700">{euros(totalLigne)}</td>
                    <td className="pr-2 py-2 text-center">
                      {form.lignes.length > 1 && (
                        <button type="button" onClick={() => supprimerLigne(i)}
                          className="text-red-400 hover:text-red-600 text-lg leading-none w-6 h-6 flex items-center justify-center">
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="flex justify-end px-4 py-4 border-t border-gray-100 bg-gray-50">
            <div className="space-y-1.5 text-sm w-full sm:w-64">
              <div className="flex justify-between text-gray-500">
                <span>Total HT</span>
                <span className="font-medium text-gray-800">{euros(totaux.totalHT)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>TVA</span>
                <span className="font-medium text-gray-800">{euros(totaux.totalTVA)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-gray-200 font-semibold text-gray-900">
                <span>Total TTC</span>
                <span>{euros(totaux.totalTTC)}</span>
              </div>
              {/* Acompte */}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-200 gap-3">
                <label className="text-sm text-gray-500 whitespace-nowrap">Acompte à verser (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.acompte}
                  onChange={(e) => setForm((f) => ({ ...f, acompte: Number(e.target.value) }))}
                  className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              {form.acompte > 0 && (
                <div className="flex justify-between font-bold text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                  <span>Solde à la livraison</span>
                  <span>{euros(Math.max(0, totaux.totalTTC - form.acompte))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & conditions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes & Conditions</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={form.notes} onChange={setField('notes')}
              placeholder="Informations complémentaires visibles sur le PDF…"
              className={`w-full ${cls} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conditions générales</label>
            <textarea rows={4} value={form.conditionsGenerales} onChange={setField('conditionsGenerales')}
              className={`w-full ${cls} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
            {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le devis'}
          </button>
          <button type="button" onClick={() => navigate('/devis')}
            className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
