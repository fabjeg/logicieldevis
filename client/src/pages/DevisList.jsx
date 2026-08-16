import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
const initiales = (nom) =>
  (nom || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '—';

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

  const actionCls = 'text-xs font-medium hover:opacity-70 transition-opacity';

  return (
    <div className="p-4 space-y-4">
      {Modal}
      {preview && (
        <PDFPreviewModal
          devisId={preview.id}
          numero={preview.numero}
          onClose={() => setPreview(null)}
        />
      )}

      {/* En-tête */}
      <div className="px-1 pt-1">
        <h1 className="text-[22px] font-extrabold tracking-tightest text-ink">Devis</h1>
        <p className="text-sm text-muted mt-0.5">{total} au total</p>
      </div>

      {/* Recherche */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-faint"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
        </svg>
        <input
          type="search"
          placeholder="Rechercher par N°, client…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-surface rounded-field pl-11 pr-4 py-3 text-sm text-ink placeholder:text-faint shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {FILTRES.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatut(f.value); setPage(1); }}
            className={`px-3.5 py-2 text-xs rounded-full font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              statut === f.value
                ? 'bg-accent text-white'
                : 'bg-surface text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-card shadow-soft p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-chip bg-page animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-page rounded animate-pulse w-1/2" />
                <div className="h-3 bg-page rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))
        ) : devis.length === 0 ? (
          <div className="bg-surface rounded-card shadow-soft py-14 text-center text-muted text-sm">
            Aucun devis trouvé
          </div>
        ) : (
          devis.map((d) => {
            const nomClient = d.client
              ? `${d.client.prenom} ${d.client.nom}`
              : d.snapshotClient
              ? `${d.snapshotClient.prenom} ${d.snapshotClient.nom}`
              : '—';
            const entreprise = d.client?.entreprise || d.snapshotClient?.entreprise;

            return (
              <div key={d._id} className="bg-surface rounded-card shadow-soft p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initiales(nomClient)}
                  </div>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/devis/${d._id}/modifier`)}
                  >
                    <p className="text-sm font-semibold text-ink truncate">{nomClient}</p>
                    <p className="text-xs text-muted truncate">
                      {d.numero || '—'} · {datesFR(d.dateCreation)}
                      {entreprise ? ` · ${entreprise}` : ''}
                    </p>
                  </div>
                  <div className="relative flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-ink tnum">{euros(d.totalTTC)}</span>
                    <button onClick={() => setStatutMenu(statutMenu === d._id ? null : d._id)}>
                      <StatutBadge statut={d.statut} />
                    </button>
                    {statutMenu === d._id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 z-20 bg-surface rounded-[16px] shadow-tab py-1 min-w-36"
                      >
                        {STATUTS.filter((s) => s !== d.statut).map((s) => (
                          <button
                            key={s}
                            onClick={() => changerStatut(d._id, s)}
                            className="w-full text-left px-3 py-2 hover:bg-page flex items-center gap-2"
                          >
                            <StatutBadge statut={s} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-page flex flex-wrap gap-x-4 gap-y-2">
                  <button onClick={() => setPreview({ id: d._id, numero: d.numero })} className={`${actionCls} text-muted`}>Aperçu</button>
                  <button onClick={() => telechargerPDF(d._id, d.numero)} className={`${actionCls} text-muted`}>PDF</button>
                  <button onClick={() => dupliquer(d)} className={`${actionCls} text-muted`}>Dupliquer</button>
                  <button onClick={() => navigate(`/devis/${d._id}/prix-pro`)} className={`${actionCls} text-success`}>Prix pro</button>
                  <button onClick={() => navigate(`/devis/${d._id}/modifier`)} className={`${actionCls} text-accent`}>Modifier</button>
                  <button onClick={() => supprimer(d)} className={`${actionCls} text-danger`}>Supprimer</button>
                </div>
              </div>
            );
          })
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
