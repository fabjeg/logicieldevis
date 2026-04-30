import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

export default function ClientsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, Modal } = useConfirm();

  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get('/clients', { params });
      setClients(data.clients);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(charger, 300);
    return () => clearTimeout(t);
  }, [charger]);

  const supprimer = async (c) => {
    const ok = await confirm(
      `Supprimer ${c.prenom} ${c.nom} ?`,
      'Cette action est irréversible.'
    );
    if (!ok) return;
    try {
      await api.delete(`/clients/${c._id}`);
      toast.success('Client supprimé');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-4">
      {Modal}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Clients ({total})</h1>
        <Link
          to="/clients/nouveau"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nouveau client
        </Link>
      </div>

      <input
        type="search"
        placeholder="Rechercher par nom, prénom, entreprise, email…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Entreprise</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Téléphone</th>
              <th className="text-left px-4 py-3">Ville</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/clients/${c._id}`}
                      className="font-medium text-gray-800 hover:text-indigo-600"
                    >
                      {c.prenom} {c.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.entreprise || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.telephone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.adresse?.ville || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/clients/${c._id}/modifier`)}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimer(c)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm rounded border disabled:opacity-40">← Précédent</button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm rounded border disabled:opacity-40">Suivant →</button>
          </div>
        )}
      </div>
    </div>
  );
}
