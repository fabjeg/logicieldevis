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
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-red-500">Client introuvable.</div>;
  }

  const totalCA = devis
    .filter((d) => d.statut === 'accepté')
    .reduce((acc, d) => acc + (d.totalTTC || 0), 0);

  const addr = client.adresse || {};
  const addrLigne = [addr.rue, [addr.codePostal, addr.ville].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {Modal}

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/clients" className="hover:text-gray-600">Clients</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{client.prenom} {client.nom}</span>
      </div>

      {/* Fiche client */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {client.prenom} {client.nom}
            </h1>
            {client.entreprise && (
              <p className="text-gray-500 text-sm mt-0.5">{client.entreprise}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to={`/devis/nouveau?clientId=${client._id}`}
              className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              + Nouveau devis
            </Link>
            <button
              onClick={() => navigate(`/clients/${id}/modifier`)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Modifier
            </button>
            <button
              onClick={supprimerClient}
              className="text-sm px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 font-medium"
            >
              Supprimer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-5 text-sm">
          <Info label="Email" value={client.email} />
          <Info label="Téléphone" value={client.telephone || '—'} />
          {addrLigne && <Info label="Adresse" value={addrLigne} className="col-span-2" />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={devis.length} label="Devis au total" />
        <StatCard
          value={devis.filter((d) => d.statut === 'accepté').length}
          label="Acceptés"
          color="text-green-600"
        />
        <StatCard value={euros(totalCA)} label="CA accepté" />
      </div>

      {/* Historique */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historique des devis</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2">N°</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Expiration</th>
              <th className="text-right px-4 py-2">Total TTC</th>
              <th className="text-left px-4 py-2">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {devis.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun devis pour ce client
                </td>
              </tr>
            ) : (
              devis.map((d) => (
                <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {d.numero || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{datesFR(d.dateCreation)}</td>
                  <td className="px-4 py-3 text-gray-500">{datesFR(d.dateExpiration)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {euros(d.totalTTC)}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={d.statut} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/devis/${d._id}/modifier`}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}

function StatCard({ value, label, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
