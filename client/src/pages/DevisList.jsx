import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatutBadge from '../components/StatutBadge';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import PDFPreviewModal from '../components/PDFPreviewModal';

const FILTRES = [
  { value: '', label: 'Tous' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'envoyé', label: 'Envoyés' },
  { value: 'accepté', label: 'Acceptés' },
  { value: 'refusé', label: 'Refusés' },
];

const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'];

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const datesFR = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function DevisList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, Modal } = useConfirm();

  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [devis, setDevis] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statutMenu, setStatutMenu] = useState(null); // id du devis dont le menu est ouvert
  const [preview, setPreview] = useState(null); // { id, numero }
  const menuRef = useRef(null);
  const LIMIT = 20;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statut) params.statut = statut;
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get('/devis', { params });
      setDevis(data.devis);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [statut, search, page]);

  useEffect(() => {
    const t = setTimeout(charger, 300);
    return () => clearTimeout(t);
  }, [charger]);

  // Fermer le menu statut au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setStatutMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const supprimer = async (d) => {
    const ok = await confirm(
      `Supprimer ${d.numero || 'ce brouillon'} ?`,
      'Cette action est irréversible.'
    );
    if (!ok) return;
    try {
      await api.delete(`/devis/${d._id}`);
      toast.success('Devis supprimé');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const dupliquer = async (d) => {
    try {
      await api.post(`/devis/${d._id}/dupliquer`);
      toast.success('Devis dupliqué (brouillon)');
      charger();
    } catch {
      toast.error('Erreur lors de la duplication');
    }
  };

  const changerStatut = async (devisId, newStatut) => {
    try {
      await api.put(`/devis/${devisId}`, { statut: newStatut });
      toast.success('Statut mis à jour');
      setStatutMenu(null);
      charger();
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const telechargerPDF = async (id, numero) => {
    try {
      const response = await api.get(`/devis/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${numero || 'devis'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {Modal}
      {preview && (
        <PDFPreviewModal
          devisId={preview.id}
          numero={preview.numero}
          onClose={() => setPreview(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Devis ({total})</h1>
        <Link
          to="/devis/nouveau"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nouveau
        </Link>
      </div>

      {/* Barre recherche + filtres */}
      <div className="space-y-2">
        <input
          type="search"
          placeholder="Rechercher par N°, client…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTRES.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatut(f.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                statut === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Mobile: cartes */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-1.5">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              </div>
            ))
          ) : devis.length === 0 ? (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">Aucun devis trouvé</p>
          ) : devis.map((d) => {
            const nomClient = d.client
              ? `${d.client.prenom} ${d.client.nom}`
              : d.snapshotClient
              ? `${d.snapshotClient.prenom} ${d.snapshotClient.nom}`
              : '—';
            return (
              <div key={d._id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{nomClient}</p>
                    <p className="text-xs text-gray-400">{d.numero || '—'} · {datesFR(d.dateCreation)}</p>
                  </div>
                  <div className="relative flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-800">{euros(d.totalTTC)}</span>
                    <button
                      onClick={() => setStatutMenu(statutMenu === d._id ? null : d._id)}
                      className="hover:opacity-70"
                    >
                      <StatutBadge statut={d.statut} />
                    </button>
                    {statutMenu === d._id && (
                      <div ref={menuRef} className="absolute right-0 top-full z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-36">
                        {STATUTS.filter((s) => s !== d.statut).map((s) => (
                          <button key={s} onClick={() => changerStatut(d._id, s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                            <StatutBadge statut={s} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <button onClick={() => setPreview({ id: d._id, numero: d.numero })} className="text-gray-400 hover:text-gray-700">Aperçu</button>
                  <button onClick={() => telechargerPDF(d._id, d.numero)} className="text-gray-400 hover:text-gray-700">PDF</button>
                  <button onClick={() => dupliquer(d)} className="text-gray-500 hover:text-gray-800">Dupliquer</button>
                  <button onClick={() => navigate(`/devis/${d._id}/modifier`)} className="text-indigo-600 font-medium">Modifier</button>
                  <button onClick={() => supprimer(d)} className="text-red-500">Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: tableau */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3">N°</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Expiration</th>
                <th className="text-right px-4 py-3">Total TTC</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : devis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Aucun devis trouvé
                  </td>
                </tr>
              ) : (
                devis.map((d) => {
                  const nomClient = d.client
                    ? `${d.client.prenom} ${d.client.nom}`
                    : d.snapshotClient
                    ? `${d.snapshotClient.prenom} ${d.snapshotClient.nom}`
                    : '—';
                  const entreprise = d.client?.entreprise || d.snapshotClient?.entreprise;

                  return (
                    <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {d.numero || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {nomClient}
                        {entreprise && (
                          <span className="text-gray-400 text-xs ml-1">· {entreprise}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{datesFR(d.dateCreation)}</td>
                      <td className="px-4 py-3 text-gray-500">{datesFR(d.dateExpiration)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{euros(d.totalTTC)}</td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setStatutMenu(statutMenu === d._id ? null : d._id)}
                          className="hover:opacity-70 transition-opacity"
                          title="Changer le statut"
                        >
                          <StatutBadge statut={d.statut} />
                        </button>
                        {statutMenu === d._id && (
                          <div ref={menuRef} className="absolute left-2 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-36">
                            {STATUTS.filter((s) => s !== d.statut).map((s) => (
                              <button key={s} onClick={() => changerStatut(d._id, s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <StatutBadge statut={s} />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button onClick={() => setPreview({ id: d._id, numero: d.numero })} className="text-gray-400 hover:text-gray-700 text-xs">Aperçu</button>
                        <button onClick={() => telechargerPDF(d._id, d.numero)} className="text-gray-400 hover:text-gray-700 text-xs">PDF</button>
                        <button onClick={() => dupliquer(d)} className="text-gray-500 hover:text-gray-800 text-xs">Dupliquer</button>
                        <button onClick={() => navigate(`/devis/${d._id}/modifier`)} className="text-indigo-600 hover:underline text-xs">Modifier</button>
                        <button onClick={() => supprimer(d)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-2 text-sm rounded border disabled:opacity-40">← Préc.</button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 text-sm rounded border disabled:opacity-40">Suiv. →</button>
          </div>
        )}
      </div>
    </div>
  );
}
