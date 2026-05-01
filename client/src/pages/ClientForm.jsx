import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const VIDE = {
  nom: '', prenom: '', entreprise: '', email: '', telephone: '',
  adresse: { rue: '', codePostal: '', ville: '', pays: 'France' },
};

const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
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
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Modifier le client' : 'Nouveau client'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prénom *">
            <input required className={cls} value={form.prenom} onChange={set('prenom')} />
          </Field>
          <Field label="Nom *">
            <input required className={cls} value={form.nom} onChange={set('nom')} />
          </Field>
        </div>

        <Field label="Entreprise">
          <input className={cls} value={form.entreprise} onChange={set('entreprise')} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email *">
            <input required type="email" className={cls} value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Téléphone">
            <input className={cls} value={form.telephone} onChange={set('telephone')} />
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Adresse</p>
          <div className="space-y-3">
            <Field label="Rue">
              <input className={cls} value={form.adresse.rue} onChange={setAddr('rue')} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Code postal">
                <input className={cls} value={form.adresse.codePostal} onChange={setAddr('codePostal')} />
              </Field>
              <div className="col-span-1 sm:col-span-2">
                <Field label="Ville">
                  <input className={cls} value={form.adresse.ville} onChange={setAddr('ville')} />
                </Field>
              </div>
            </div>
            <Field label="Pays">
              <input className={cls} value={form.adresse.pays} onChange={setAddr('pays')} />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm"
          >
            {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le client'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
