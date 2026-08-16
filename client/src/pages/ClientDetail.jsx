import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import StatutBadge from '../components/StatutBadge';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const datesFR = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, Modal } = useConfirm();

  const [client, setClient] = useState(null);
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/devis?clientId=${id}&limit=100`),
    ])
      .then(([c, d]) => {
        setClient(c.data);
        setDevis(d.data.devis);
      })
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  const supprimerClient = async () => {
    const ok = await confirm(
      'Supprimer ce client ?',
      'Cette action est irréversible. Les devis associés ne seront pas supprimés.'
    );
    if (!ok) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client supprimé');
      navigate('/clients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface rounded-card shadow-soft animate-pulse" />
        ))}
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-danger">Client introuvable.</div>;
  }

  const totalCA = devis
    .filter((d) => d.statut === 'accepté')
    .reduce((acc, d) => acc + (d.totalTTC || 0), 0);

  const addr = client.adresse || {};
  const addrLigne = [addr.rue, [addr.codePostal, addr.ville].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const initiales = ((client.prenom?.[0] || '') + (client.nom?.[0] || '')).toUpperCase();

  return (
    <div className="p-4 space-y-5">
      {Modal}

      {/* Retour */}
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted px-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Clients
      </Link>

      {/* Carte contact */}
      <div className="bg-surface rounded-card shadow-soft p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-[18px] bg-accent-soft text-accent flex items-center justify-center text-lg font-extrabold">
          {initiales || '—'}
        </div>
        <h1 className="mt-3 text-lg font-extrabold tracking-tightest text-ink">
          {client.prenom} {client.nom}
        </h1>
        {client.entreprise && <p className="text-sm text-muted mt-0.5">{client.entreprise}</p>}

        {/* Coordonnées */}
        <div className="w-full mt-4 space-y-1 text-sm">
          <p className="text-ink">{client.email}</p>
          <p className="text-muted">{client.telephone || '—'}</p>
          {addrLigne && <p className="text-muted">{addrLigne}</p>}
        </div>

        {/* Actions rapides */}
        <div className="w-full mt-5 grid grid-cols-3 gap-2">
          <Link
            to={`/devis/nouveau?clientId=${client._id}`}
            className="flex flex-col items-center gap-1 py-2.5 rounded-field bg-accent-soft text-accent text-xs font-semibold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Devis
          </Link>
          <button
            onClick={() => navigate(`/clients/${id}/modifier`)}
            className="flex flex-col items-center gap-1 py-2.5 rounded-field bg-page text-ink text-xs font-semibold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            Modifier
          </button>
          <button
            onClick={supprimerClient}
            className="flex flex-col items-center gap-1 py-2.5 rounded-field bg-danger-soft text-danger text-xs font-semibold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            Suppr.
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={devis.length} label="Devis" />
        <StatCard value={devis.filter((d) => d.statut === 'accepté').length} label="Acceptés" color="text-success" />
        <StatCard value={euros(totalCA)} label="CA accepté" small />
      </div>

      {/* Historique */}
      <div className="space-y-3">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Historique des devis</p>
        {devis.length === 0 ? (
          <div className="bg-surface rounded-card shadow-soft py-12 text-center text-muted text-sm">
            Aucun devis pour ce client
          </div>
        ) : (
          devis.map((d) => (
            <div
              key={d._id}
              onClick={() => navigate(`/devis/${d._id}/modifier`)}
              className="bg-surface rounded-card shadow-soft p-4 flex items-center gap-3 cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{d.numero || 'Brouillon'}</p>
                <p className="text-xs text-muted">
                  {datesFR(d.dateCreation)} · exp. {datesFR(d.dateExpiration)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-ink tnum">{euros(d.totalTTC)}</span>
                <StatutBadge statut={d.statut} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, color = 'text-ink', small = false }) {
  return (
    <div className="bg-surface rounded-[18px] shadow-soft p-4 text-center">
      <p className={`${small ? 'text-sm' : 'text-2xl'} font-extrabold tnum ${color}`}>{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}
