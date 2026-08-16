import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const cls =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function DevisPrixPro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [devis, setDevis] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/devis/${id}`).then(({ data }) => {
      setDevis(data);
      setLignes(data.lignes.map((l) => ({ ...l, prixProHT: l.prixProHT || 0 })));
      setLoading(false);
    });
  }, [id]);

  const setPrixPro = (i) => (e) =>
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = { ...copie[i], prixProHT: e.target.value };
      return copie;
    });

  const totaux = useMemo(() => {
    let coutTotal = 0;
    let clientTotal = 0;
    for (const l of lignes) {
      coutTotal += (Number(l.quantite) || 0) * (Number(l.prixProHT) || 0);
      clientTotal += (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
    }
    const marge = clientTotal - coutTotal;
    const margePct = clientTotal > 0 ? (marge / clientTotal) * 100 : 0;
    return {
      coutTotal: Math.round(coutTotal * 100) / 100,
      clientTotal: Math.round(clientTotal * 100) / 100,
      marge: Math.round(marge * 100) / 100,
      margePct: Math.round(margePct * 10) / 10,
    };
  }, [lignes]);

  const enregistrer = async () => {
    setSaving(true);
    try {
      await api.put(`/devis/${id}`, {
        lignes: lignes.map((l) => ({
          description: l.description,
          quantite: Number(l.quantite),
          prixUnitaireHT: Number(l.prixUnitaireHT),
          tauxTVA: Number(l.tauxTVA),
          prixProHT: Number(l.prixProHT) || 0,
        })),
      });
      toast.success('Prix pro enregistrés');
      navigate('/devis');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 md:p-6 text-sm text-gray-400">Chargement…</div>;

  const nomClient = devis?.client
    ? `${devis.client.prenom} ${devis.client.nom}`
    : devis?.snapshotClient
    ? `${devis.snapshotClient.prenom} ${devis.snapshotClient.nom}`
    : '—';

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Prix pro & marge</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {devis?.numero || '(brouillon)'} · {nomClient}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        🔒 Usage interne uniquement — ces coûts n'apparaissent jamais sur le devis PDF envoyé au client.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comparaison par ligne</h2>
        </div>

        {/* Mobile : cartes */}
        <div className="sm:hidden divide-y divide-gray-100">
          {lignes.map((l, i) => {
            const coutLigne = (Number(l.quantite) || 0) * (Number(l.prixProHT) || 0);
            const clientLigne = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
            return (
              <div key={i} className="p-4 space-y-2">
                <p className="text-sm text-gray-800">{l.description}</p>
                <p className="text-xs text-gray-400">Qté {l.quantite} · Prix client {euros(l.prixUnitaireHT)}/u</p>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-gray-500">Prix pro HT (€/u)</label>
                  <input type="number" min="0" step="0.01" value={l.prixProHT} onChange={setPrixPro(i)} className={`w-28 ${cls}`} />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-400">Coût : {euros(coutLigne)}</span>
                  <span className="font-medium text-emerald-700">Marge : {euros(clientLigne - coutLigne)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop : tableau */}
        <table className="hidden sm:table w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-right px-2 py-2 w-16">Qté</th>
              <th className="text-right px-2 py-2 w-28">Prix client HT</th>
              <th className="text-right px-2 py-2 w-32">Prix pro HT</th>
              <th className="text-right px-2 py-2 w-28">Coût total</th>
              <th className="text-right px-4 py-2 w-28">Marge</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const coutLigne = (Number(l.quantite) || 0) * (Number(l.prixProHT) || 0);
              const clientLigne = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
              const margeLigne = clientLigne - coutLigne;
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-700">{l.description}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{l.quantite}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{euros(l.prixUnitaireHT)}</td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" value={l.prixProHT} onChange={setPrixPro(i)} className={`w-full ${cls}`} />
                  </td>
                  <td className="px-2 py-2 text-right text-gray-500">{euros(coutLigne)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${margeLigne >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {euros(margeLigne)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:items-end gap-1.5 text-sm">
          <div className="flex justify-between w-full sm:w-72 text-gray-500">
            <span>Total coût pro HT</span>
            <span className="font-medium text-gray-800">{euros(totaux.coutTotal)}</span>
          </div>
          <div className="flex justify-between w-full sm:w-72 text-gray-500">
            <span>Total client HT</span>
            <span className="font-medium text-gray-800">{euros(totaux.clientTotal)}</span>
          </div>
          <div className={`flex justify-between w-full sm:w-72 pt-1.5 border-t border-gray-200 font-semibold ${totaux.marge >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            <span>Marge</span>
            <span>{euros(totaux.marge)} ({totaux.margePct} %)</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" disabled={saving} onClick={enregistrer}
          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <Link to="/devis"
          className="flex-1 sm:flex-none text-center px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Annuler
        </Link>
      </div>
    </div>
  );
}
