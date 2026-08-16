import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

const initiales = (prenom, nom) =>
  ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '—';

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
    <div className="p-4 space-y-4">
      {Modal}

      {/* En-tête */}
      <div className="px-1 pt-1">
        <h1 className="text-[22px] font-extrabold tracking-tightest text-ink">Clients</h1>
        <p className="text-sm text-muted mt-0.5">{total} au total</p>
      </div>

      {/* Recherche */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
        </svg>
        <input
          type="search"
          placeholder="Rechercher par nom, entreprise, email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-surface rounded-field pl-11 pr-4 py-3 text-sm text-ink placeholder:text-faint shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-card shadow-soft p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-chip bg-page animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-page rounded animate-pulse w-1/2" />
                <div className="h-3 bg-page rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))
        ) : clients.length === 0 ? (
          <div className="bg-surface rounded-card shadow-soft py-14 text-center text-muted text-sm">
            Aucun client trouvé
          </div>
        ) : (
          clients.map((c) => (
            <div key={c._id} className="bg-surface rounded-card shadow-soft p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initiales(c.prenom, c.nom)}
                </div>
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/clients/${c._id}`)}
                >
                  <p className="text-sm font-semibold text-ink truncate">{c.prenom} {c.nom}</p>
                  <p className="text-xs text-muted truncate">
                    {[c.entreprise, c.telephone || c.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-page flex gap-4">
                <button onClick={() => navigate(`/clients/${c._id}`)} className="text-xs font-medium text-muted hover:opacity-70">Voir</button>
                <button onClick={() => navigate(`/clients/${c._id}/modifier`)} className="text-xs font-semibold text-accent hover:opacity-70">Modifier</button>
                <button onClick={() => supprimer(c)} className="text-xs font-medium text-danger hover:opacity-70">Supprimer</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm font-medium rounded-field bg-surface text-ink shadow-soft disabled:opacity-40"
          >
            ← Préc.
          </button>
          <span className="text-sm text-muted tnum">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm font-medium rounded-field bg-surface text-ink shadow-soft disabled:opacity-40"
          >
            Suiv. →
          </button>
        </div>
      )}
    </div>
  );
}
