import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatutBadge from '../components/StatutBadge';

const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'];
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const datesFR = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Dashboard() {
  const [stats, setStats] = useState({ parStatut: [], caMensuel: [] });
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/devis/stats'),
      api.get('/devis?limit=5'),
    ]).then(([s, r]) => {
      setStats(s.data);
      setRecents(r.data.devis);
    }).finally(() => setLoading(false));
  }, []);

  const statByStatus = (s) =>
    stats.parStatut.find((x) => x._id === s) || { count: 0, totalTTC: 0 };

  const now = new Date();
  const mois12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { annee: d.getFullYear(), mois: d.getMonth() + 1, label: MOIS[d.getMonth()] };
  });
  const caData = mois12.map((m) => {
    const found = stats.caMensuel.find(
      (c) => c._id.annee === m.annee && c._id.mois === m.mois
    );
    return { ...m, totalTTC: found?.totalTTC || 0 };
  });
  const maxCA = Math.max(...caData.map((m) => m.totalTTC), 1);

  if (loading) {
    return (
      <div className="p-6 text-gray-400 text-sm">Chargement…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Tableau de bord</h1>
        <Link
          to="/devis/nouveau"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nouveau
        </Link>
      </div>

      {/* Cartes statuts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUTS.map((s) => {
          const d = statByStatus(s);
          return (
            <div key={s} className="bg-white rounded-xl border border-gray-200 p-4">
              <StatutBadge statut={s} />
              <p className="mt-2 text-2xl font-bold text-gray-900">{d.count}</p>
              {s !== 'brouillon' && (
                <p className="text-xs text-gray-400 mt-0.5">{euros(d.totalTTC)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* CA mensuel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">CA mensuel accepté (12 derniers mois)</h2>
        <div className="flex items-end gap-1 h-28 md:h-36">
          {caData.map((m) => (
            <div
              key={`${m.annee}-${m.mois}`}
              className="flex-1 flex flex-col items-center gap-1"
              title={euros(m.totalTTC)}
            >
              <div
                className="w-full bg-indigo-500 rounded-t transition-all"
                style={{
                  height: `${(m.totalTTC / maxCA) * 112}px`,
                  minHeight: m.totalTTC > 0 ? '4px' : '0',
                }}
              />
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Derniers devis */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Derniers devis</h2>
          <Link to="/devis" className="text-xs text-indigo-600 hover:underline">Voir tout</Link>
        </div>

        {/* Mobile: cartes */}
        <div className="sm:hidden divide-y divide-gray-50">
          {recents.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400 text-sm">Aucun devis pour l'instant</p>
          ) : recents.map((d) => (
            <div key={d._id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {d.client ? `${d.client.prenom} ${d.client.nom}` : '—'}
                </p>
                <p className="text-xs text-gray-400">{d.numero || '—'} · {datesFR(d.dateCreation)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-medium text-gray-800">{euros(d.totalTTC)}</span>
                <StatutBadge statut={d.statut} />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: tableau */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3">N°</th>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Total TTC</th>
                <th className="text-left px-5 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recents.map((d) => (
                <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {d.numero || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {d.client
                      ? `${d.client.prenom} ${d.client.nom}${d.client.entreprise ? ` · ${d.client.entreprise}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{datesFR(d.dateCreation)}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-800">{euros(d.totalTTC)}</td>
                  <td className="px-5 py-3"><StatutBadge statut={d.statut} /></td>
                </tr>
              ))}
              {recents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    Aucun devis pour l'instant
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
