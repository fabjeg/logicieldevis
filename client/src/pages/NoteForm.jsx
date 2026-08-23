import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

const fieldCard = 'block bg-surface rounded-field px-4 py-2.5 shadow-soft';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1';
const inputCls = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:ring-0';
const sectionLabel = 'px-1 text-[11px] font-bold uppercase tracking-wide text-muted';

export default function NoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, Modal } = useConfirm();
  const isEdit = Boolean(id);

  const [clientMode, setClientMode] = useState('nouveau'); // 'nouveau' | 'existant'
  const [clientNom, setClientNom] = useState('');
  const [clientId, setClientId] = useState(null);
  const [search, setSearch] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [contenu, setContenu] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/notes/${id}`).then(({ data }) => {
      setClientNom(data.clientNom || '');
      setClientId(data.clientId || null);
      setContenu(data.contenu || '');
      setClientMode(data.clientId ? 'existant' : 'nouveau');
      setLoading(false);
    });
  }, [id, isEdit]);

  useEffect(() => {
    if (clientMode !== 'existant' || clientId || search.trim().length < 2) {
      setResultats([]);
      return;
    }
    setRecherche(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/clients', { params: { q: search.trim(), limit: 8 } });
        setResultats(data.clients);
      } finally {
        setRecherche(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, clientMode, clientId]);

  const choisirClient = (c) => {
    setClientId(c._id);
    setClientNom(`${c.prenom} ${c.nom}`);
    setSearch('');
    setResultats([]);
  };

  const enregistrer = async () => {
    if (!contenu.trim()) {
      toast.error('Écrivez au moins une note');
      return;
    }
    setSaving(true);
    try {
      const payload = { clientId: clientId || undefined, clientNom: clientNom.trim(), contenu };
      if (isEdit) {
        await api.put(`/notes/${id}`, payload);
        toast.success('Note enregistrée');
      } else {
        await api.post('/notes', payload);
        toast.success('Note créée');
      }
      navigate('/notes');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async () => {
    const ok = await confirm('Supprimer cette note ?', 'Cette action est irréversible.');
    if (!ok) return;
    try {
      await api.delete(`/notes/${id}`);
      toast.success('Note supprimée');
      navigate('/notes');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="p-4 text-sm text-muted">Chargement…</div>;

  return (
    <div className="p-4 space-y-5">
      {Modal}

      <h1 className="text-[22px] font-extrabold tracking-tightest text-ink px-1 pt-1">
        {isEdit ? 'Note' : 'Nouvelle note'}
      </h1>

      {/* Client (optionnel) */}
      <div className="space-y-3">
        <p className={sectionLabel}>Client / chantier (optionnel)</p>

        <div className="bg-surface rounded-field shadow-soft p-1 flex gap-1">
          <button
            type="button"
            onClick={() => { setClientMode('nouveau'); setClientId(null); }}
            className={`flex-1 py-2.5 rounded-[12px] text-sm font-semibold transition-colors ${
              clientMode === 'nouveau' ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            Libre
          </button>
          <button
            type="button"
            onClick={() => setClientMode('existant')}
            className={`flex-1 py-2.5 rounded-[12px] text-sm font-semibold transition-colors ${
              clientMode === 'existant' ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            Client existant
          </button>
        </div>

        {clientMode === 'nouveau' ? (
          <label className={fieldCard}>
            <span className={labelCls}>Nom du client ou du chantier</span>
            <input
              className={inputCls}
              placeholder="Ex : M. Durand, haie rue des Prés…"
              value={clientNom}
              onChange={(e) => { setClientNom(e.target.value); setClientId(null); }}
            />
          </label>
        ) : clientId ? (
          <div className="bg-surface rounded-field shadow-soft flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-chip bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
              {clientNom.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-ink truncate flex-1">{clientNom}</p>
            <button
              type="button"
              onClick={() => { setClientId(null); setClientNom(''); }}
              className="text-xs font-semibold text-accent flex-shrink-0"
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
              </svg>
              <input
                type="search"
                placeholder="Rechercher un client…"
                className="w-full bg-surface rounded-field pl-11 pr-4 py-3 text-sm text-ink placeholder:text-faint shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search.trim().length >= 2 && (
              <div className="mt-2 bg-surface rounded-field shadow-soft overflow-hidden divide-y divide-page max-h-56 overflow-y-auto">
                {recherche ? (
                  <p className="px-4 py-3 text-sm text-muted">Recherche…</p>
                ) : resultats.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">Aucun client trouvé</p>
                ) : (
                  resultats.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => choisirClient(c)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-page"
                    >
                      <span className="font-semibold text-ink">{c.prenom} {c.nom}</span>
                      {c.entreprise && <span className="text-muted"> · {c.entreprise}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <p className={sectionLabel}>Notes de fabrication</p>
        <div className="bg-surface rounded-card shadow-soft p-4">
          <textarea
            autoFocus={!isEdit}
            rows={12}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder={'Tout ce qu\'il faut pour préparer le devis :\n• mesures, quantités\n• matériaux, contraintes d\'accès\n• demandes du client, budget évoqué…'}
            className="w-full bg-transparent border-0 p-0 text-[15px] leading-relaxed text-ink placeholder:text-faint resize-y focus:outline-none"
          />
        </div>
      </div>

      {/* Passerelle vers le devis (si client lié) */}
      {isEdit && clientId && (
        <button
          type="button"
          onClick={() => navigate(`/devis/nouveau?clientId=${clientId}`)}
          className="w-full bg-accent-soft text-accent font-semibold py-3 rounded-field flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Créer le devis pour ce client
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={enregistrer}
          className="flex-1 bg-accent-gradient text-white font-semibold py-3.5 rounded-field shadow-fab active:scale-[0.99] transition-transform disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={supprimer}
            className="px-5 py-3.5 text-sm font-semibold text-danger bg-surface rounded-field shadow-soft"
          >
            Supprimer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="px-5 py-3.5 text-sm font-semibold text-muted bg-surface rounded-field shadow-soft"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
