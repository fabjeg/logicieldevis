import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const cls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const VIDE = {
  entreprise: { nom: '', adresse: { rue: '', codePostal: '', ville: '', pays: 'France' }, email: '', telephone: '', siret: '' },
  logo: '',
  mentionsLegalesDefaut: '',
  prefixeNumero: 'DEV',
  delaiExpirationDefaut: 30,
};

export default function Settings() {
  const toast = useToast();
  const [form, setForm] = useState(VIDE);
  const [pw, setPw] = useState({ current: '', nouveau: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setForm({
        entreprise: data.entreprise ?? VIDE.entreprise,
        logo: data.logo ?? '',
        mentionsLegalesDefaut: data.mentionsLegalesDefaut ?? '',
        prefixeNumero: data.prefixeNumero ?? 'DEV',
        delaiExpirationDefaut: data.delaiExpirationDefaut ?? 30,
      });
    });
  }, []);

  const setEnt = (field) => (e) =>
    setForm((f) => ({ ...f, entreprise: { ...f.entreprise, [field]: e.target.value } }));

  const setAddr = (field) => (e) =>
    setForm((f) => ({
      ...f,
      entreprise: { ...f.entreprise, adresse: { ...f.entreprise.adresse, [field]: e.target.value } },
    }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/settings', form);
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pw.nouveau !== pw.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (pw.nouveau.length < 8) { toast.error('Le mot de passe doit faire au moins 8 caractères'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.nouveau });
      toast.success('Mot de passe modifié');
      setPw({ current: '', nouveau: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>

      {/* ── Entreprise ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Mon entreprise">
          <Field label="Nom de l'entreprise">
            <input className={cls} value={form.entreprise.nom} onChange={setEnt('nom')} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" className={cls} value={form.entreprise.email} onChange={setEnt('email')} />
            </Field>
            <Field label="Téléphone">
              <input className={cls} value={form.entreprise.telephone} onChange={setEnt('telephone')} />
            </Field>
          </div>
          <Field label="SIRET">
            <input className={cls} value={form.entreprise.siret} onChange={setEnt('siret')} />
          </Field>
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Adresse</p>
            <Field label="Rue">
              <input className={cls} value={form.entreprise.adresse.rue} onChange={setAddr('rue')} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Code postal">
                <input className={cls} value={form.entreprise.adresse.codePostal} onChange={setAddr('codePostal')} />
              </Field>
              <div className="col-span-1 sm:col-span-2">
                <Field label="Ville">
                  <input className={cls} value={form.entreprise.adresse.ville} onChange={setAddr('ville')} />
                </Field>
              </div>
            </div>
            <Field label="Pays">
              <input className={cls} value={form.entreprise.adresse.pays} onChange={setAddr('pays')} />
            </Field>
          </div>
        </Section>

        {/* ── Logo ── */}
        <Section title="Logo">
          <input type="file" accept="image/*" onChange={handleLogo} className="text-sm text-gray-600" />
          {form.logo && (
            <div className="flex items-center gap-3 mt-2">
              <img src={form.logo} alt="Logo" className="h-16 object-contain border border-gray-100 rounded-lg" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                className="text-xs text-red-500 hover:underline">Supprimer</button>
            </div>
          )}
        </Section>

        {/* ── Numérotation ── */}
        <Section title="Numérotation des devis">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Préfixe" hint={`Exemple : DEV → DEV-2026-001`}>
              <input className={cls} value={form.prefixeNumero}
                onChange={(e) => setForm((f) => ({ ...f, prefixeNumero: e.target.value.toUpperCase() }))}
                maxLength={10} />
            </Field>
            <Field label="Délai d'expiration par défaut (jours)" hint="Pré-remplit la date sur les nouveaux devis">
              <input type="number" min="0" max="365" className={cls} value={form.delaiExpirationDefaut}
                onChange={(e) => setForm((f) => ({ ...f, delaiExpirationDefaut: Number(e.target.value) }))} />
            </Field>
          </div>
        </Section>

        {/* ── Mentions légales ── */}
        <Section title="Mentions légales & conditions par défaut"
          subtitle="Pré-remplies dans les nouveaux devis et affichées en pied de page PDF.">
          <textarea rows={5} value={form.mentionsLegalesDefaut}
            onChange={(e) => setForm((f) => ({ ...f, mentionsLegalesDefaut: e.target.value }))}
            className={`${cls} resize-none`} />
        </Section>

        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm">
          {loading ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </form>

      {/* ── Mot de passe ── */}
      <form onSubmit={handleChangePassword} className="space-y-4">
        <Section title="Changer le mot de passe">
          <div className="space-y-3">
            <Field label="Mot de passe actuel">
              <input type="password" required className={cls} value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
            </Field>
            <Field label="Nouveau mot de passe">
              <input type="password" required className={cls} value={pw.nouveau}
                onChange={(e) => setPw((p) => ({ ...p, nouveau: e.target.value }))} />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input type="password" required className={cls} value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            </Field>
          </div>
          <button type="submit" disabled={pwLoading}
            className="mt-1 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm">
            {pwLoading ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </Section>
      </form>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
