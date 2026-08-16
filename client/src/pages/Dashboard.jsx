import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatutBadge from '../components/StatutBadge';

const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'];
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const euros = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const eurosCourt = (n) =>
  n >= 1000 ? `${Math.round(n / 100) / 10} k€` : `${Math.round(n)} €`;
const datesFR = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const initiales = (nom) =>
  (nom || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—';

export default function Dashboard() {
  const navigate = useNavigate();
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
  // 6 derniers mois
  const mois6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { annee: d.getFullYear(), mois: d.getMonth() + 1, label: MOIS[d.getMonth()] };
  });
  const caData = mois6.map((m) => {
    const found = stats.caMensuel.find(
      (c) => c._id.annee === m.annee && c._id.mois === m.mois
    );
    return { ...m, totalTTC: found?.totalTTC || 0 };
  });
  const maxCA = Math.max(...caData.map((m) => m.totalTTC), 1);

  if (loading) {
    return <div className="p-6 text-muted text-sm">Chargement…</div>;
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-[22px] font-extrabold tracking-tightest text-ink px-1 pt-1">Bilan</h1>

      {/* Grille de stats 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {STATUTS.map((s) => {
          const d = statByStatus(s);
          return (
            <div key={s} className="bg-surface rounded-[18px] shadow-soft p-4">
              <StatutBadge statut={s} />
              <p className="mt-3 text-2xl font-extrabold text-ink tnum">{d.count}</p>
              {s !== 'brouillon' && (
                <p className="text-xs text-muted mt-0.5 tnum">{euros(d.totalTTC)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* CA mensuel */}
      <div className="bg-surface rounded-card shadow-soft p-5">
        <h2 className="text-sm font-bold text-ink">CA accepté</h2>
        <p className="text-xs text-muted mb-4">6 derniers mois</p>
        <div className="flex items-end gap-2 h-32">
          {caData.map((m) => (
            <div key={`${m.annee}-${m.mois}`} className="flex-1 flex flex-col items-center gap-1.5" title={euros(m.totalTTC)}>
              <span className="text-[9px] font-semibold text-muted tnum h-3">
                {m.totalTTC > 0 ? eurosCourt(m.totalTTC) : ''}
              </span>
              <div className="w-full flex items-end" style={{ height: '84px' }}>
                <div
                  className="w-full bg-accent-gradient rounded-t-[8px] transition-all"
                  style={{
                    height: `${(m.totalTTC / maxCA) * 84}px`,
                    minHeight: m.totalTTC > 0 ? '4px' : '2px',
                    opacity: m.totalTTC > 0 ? 1 : 0.25,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Derniers devis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Activité récente</p>
          <Link to="/devis" className="text-xs font-semibold text-accent">Voir tout</Link>
        </div>

        {recents.length === 0 ? (
          <div className="bg-surface rounded-card shadow-soft py-12 text-center text-muted text-sm">
            Aucun devis pour l'instant
          </div>
        ) : (
          recents.map((d) => {
            const nom = d.client
              ? `${d.client.prenom} ${d.client.nom}`
              : d.snapshotClient
              ? `${d.snapshotClient.prenom} ${d.snapshotClient.nom}`
              : '—';
            return (
              <div
                key={d._id}
                onClick={() => navigate(`/devis/${d._id}/modifier`)}
                className="bg-surface rounded-card shadow-soft p-4 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initiales(nom)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{nom}</p>
                  <p className="text-xs text-muted">{d.numero || '—'} · {datesFR(d.dateCreation)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-ink tnum">{euros(d.totalTTC)}</span>
                  <StatutBadge statut={d.statut} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
