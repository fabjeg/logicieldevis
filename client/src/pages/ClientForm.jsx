import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const VIDE = {
  nom: '', prenom: '', entreprise: '', email: '', telephone: '',
  adresse: { rue: '', codePostal: '', ville: '', pays: 'France' },
};

const fieldCard = 'block bg-surface rounded-field px-4 py-2.5 shadow-soft';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1';
const inputCls = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:ring-0';
const sectionLabel = 'px-1 text-[11px] font-bold uppercase tracking-wide text-muted';

function Field({ label, children }) {
  return (
    <label className={fieldCard}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(VIDE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/clients/${id}`).then(({ data }) => setForm(data));
  }, [id, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setAddr = (field) => (e) =>
    setForm((f) => ({ ...f, adresse: { ...f.adresse, [field]: e.target.value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/clients/${id}`, form);
        toast.success('Client mis à jour');
      } else {
        await api.post('/clients', form);
        toast.success('Client créé');
      }
      navigate('/clients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-[22px] font-extrabold tracking-tightest text-ink px-1 pt-1">
        {isEdit ? 'Modifier le client' : 'Nouveau client'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <p className={sectionLabel}>Coordonnées</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *">
              <input required className={inputCls} value={form.prenom} onChange={set('prenom')} />
            </Field>
            <Field label="Nom *">
              <input required className={inputCls} value={form.nom} onChange={set('nom')} />
            </Field>
          </div>
          <Field label="Entreprise">
            <input className={inputCls} value={form.entreprise} onChange={set('entreprise')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email *">
              <input required type="email" className={inputCls} value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Téléphone">
              <input className={inputCls} value={form.telephone} onChange={set('telephone')} />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <p className={sectionLabel}>Adresse</p>
          <Field label="Rue">
            <input className={inputCls} value={form.adresse.rue} onChange={setAddr('rue')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code postal">
              <input className={inputCls} value={form.adresse.codePostal} onChange={setAddr('codePostal')} />
            </Field>
            <div className="col-span-2">
              <Field label="Ville">
                <input className={inputCls} value={form.adresse.ville} onChange={setAddr('ville')} />
              </Field>
            </div>
          </div>
          <Field label="Pays">
            <input className={inputCls} value={form.adresse.pays} onChange={setAddr('pays')} />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-accent-gradient text-white font-semibold py-3.5 rounded-field shadow-fab active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le client'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="px-5 py-3.5 text-sm font-semibold text-muted bg-surface rounded-field shadow-soft"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
