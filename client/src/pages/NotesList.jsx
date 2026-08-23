import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const datesFR = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const initiales = (nom) =>
  (nom || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function NotesList() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get('/notes', { params });
      setNotes(data.notes);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(charger, 250);
    return () => clearTimeout(t);
  }, [charger]);

  return (
    <div className="p-4 space-y-4">
      {/* En-tête */}
      <div className="px-1 pt-1">
        <h1 className="text-[22px] font-extrabold tracking-tightest text-ink">Notes</h1>
        <p className="text-sm text-muted mt-0.5">Prises sur place, pour préparer vos devis</p>
      </div>

      {/* Recherche */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
        </svg>
        <input
          type="search"
          placeholder="Rechercher dans les notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface rounded-field pl-11 pr-4 py-3 text-sm text-ink placeholder:text-faint shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-card shadow-soft p-4 space-y-2">
              <div className="h-3.5 bg-page rounded animate-pulse w-1/3" />
              <div className="h-3 bg-page rounded animate-pulse w-full" />
              <div className="h-3 bg-page rounded animate-pulse w-2/3" />
            </div>
          ))
        ) : notes.length === 0 ? (
          <div className="bg-surface rounded-card shadow-soft py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-[16px] bg-accent-soft text-accent flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </div>
            <p className="text-sm text-muted">Aucune note pour l'instant.</p>
            <p className="text-xs text-faint mt-1">Touchez le bouton + pour en créer une chez le client.</p>
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n._id}
              onClick={() => navigate(`/notes/${n._id}`)}
              className="bg-surface rounded-card shadow-soft p-4 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initiales(n.clientNom) || (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{n.clientNom || 'Note sans client'}</p>
                  <p className="text-xs text-muted">{datesFR(n.updatedAt)}</p>
                </div>
              </div>
              {n.contenu && (
                <p className="text-sm text-muted mt-2 line-clamp-2 whitespace-pre-wrap">{n.contenu}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
