import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const rowInput = 'w-full bg-transparent border-0 p-0 text-[15px] text-ink text-right placeholder:text-faint focus:outline-none';
const groupCls = 'bg-surface rounded-[18px] shadow-soft divide-y divide-page overflow-hidden';
const sectionLabel = 'px-1 mb-2 text-[11px] font-bold uppercase tracking-wide text-muted';

function Row({ label, children }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-sm text-ink flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
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
  const navigate = useNavigate();
  const { logout } = useAuth();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-[22px] font-extrabold tracking-tightest text-ink px-1 pt-1">Réglages</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entreprise */}
        <div>
          <p className={sectionLabel}>Mon entreprise</p>
          <div className={groupCls}>
            <Row label="Nom"><input className={rowInput} value={form.entreprise.nom} onChange={setEnt('nom')} placeholder="—" /></Row>
            <Row label="Email"><input type="email" className={rowInput} value={form.entreprise.email} onChange={setEnt('email')} placeholder="—" /></Row>
            <Row label="Téléphone"><input className={rowInput} value={form.entreprise.telephone} onChange={setEnt('telephone')} placeholder="—" /></Row>
            <Row label="SIRET"><input className={rowInput} value={form.entreprise.siret} onChange={setEnt('siret')} placeholder="—" /></Row>
            <Row label="Rue"><input className={rowInput} value={form.entreprise.adresse.rue} onChange={setAddr('rue')} placeholder="—" /></Row>
            <Row label="Code postal"><input className={rowInput} value={form.entreprise.adresse.codePostal} onChange={setAddr('codePostal')} placeholder="—" /></Row>
            <Row label="Ville"><input className={rowInput} value={form.entreprise.adresse.ville} onChange={setAddr('ville')} placeholder="—" /></Row>
            <Row label="Pays"><input className={rowInput} value={form.entreprise.adresse.pays} onChange={setAddr('pays')} placeholder="—" /></Row>
          </div>
        </div>

        {/* Logo */}
        <div>
          <p className={sectionLabel}>Logo</p>
          <div className={groupCls}>
            <div className="px-4 py-3 space-y-3">
              <input type="file" accept="image/*" onChange={handleLogo}
                className="text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-soft file:text-accent" />
              {form.logo && (
                <div className="flex items-center gap-3">
                  <img src={form.logo} alt="Logo" className="h-16 object-contain bg-page rounded-[12px] p-1" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                    className="text-xs font-semibold text-danger">Supprimer</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Numérotation */}
        <div>
          <p className={sectionLabel}>Numérotation des devis</p>
          <div className={groupCls}>
            <Row label="Préfixe">
              <input className={rowInput} value={form.prefixeNumero} maxLength={10}
                onChange={(e) => setForm((f) => ({ ...f, prefixeNumero: e.target.value.toUpperCase() }))} />
            </Row>
            <Row label="Délai d'expiration (jours)">
              <input type="number" min="0" max="365" className={rowInput} value={form.delaiExpirationDefaut}
                onChange={(e) => setForm((f) => ({ ...f, delaiExpirationDefaut: Number(e.target.value) }))} />
            </Row>
          </div>
          <p className="px-1 mt-2 text-xs text-muted">Exemple : {form.prefixeNumero || 'DEV'}-2026-001</p>
        </div>

        {/* Mentions légales */}
        <div>
          <p className={sectionLabel}>Mentions légales &amp; conditions</p>
          <div className={groupCls}>
            <div className="px-4 py-3">
              <textarea rows={5} value={form.mentionsLegalesDefaut}
                onChange={(e) => setForm((f) => ({ ...f, mentionsLegalesDefaut: e.target.value }))}
                placeholder="Pré-remplies dans les nouveaux devis et affichées en pied de page PDF."
                className="w-full bg-transparent border-0 p-0 text-[15px] text-ink placeholder:text-faint resize-y focus:outline-none" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-accent-gradient text-white font-semibold py-3.5 rounded-field shadow-fab active:scale-[0.99] transition-transform disabled:opacity-50">
          {loading ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </form>

      {/* Mot de passe */}
      <form onSubmit={handleChangePassword}>
        <p className={sectionLabel}>Sécurité</p>
        <div className={groupCls}>
          <Row label="Mot de passe actuel">
            <input type="password" required className={rowInput} value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} placeholder="••••••" />
          </Row>
          <Row label="Nouveau mot de passe">
            <input type="password" required className={rowInput} value={pw.nouveau}
              onChange={(e) => setPw((p) => ({ ...p, nouveau: e.target.value }))} placeholder="8 car. min." />
          </Row>
          <Row label="Confirmer">
            <input type="password" required className={rowInput} value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} placeholder="••••••" />
          </Row>
        </div>
        <button type="submit" disabled={pwLoading}
          className="w-full mt-3 bg-ink text-white font-semibold py-3.5 rounded-field active:scale-[0.99] transition-transform disabled:opacity-50">
          {pwLoading ? 'Modification…' : 'Changer le mot de passe'}
        </button>
      </form>

      {/* Compte */}
      <div>
        <p className={sectionLabel}>Compte</p>
        <button onClick={handleLogout}
          className="w-full bg-surface rounded-[18px] shadow-soft px-4 py-3.5 text-sm font-semibold text-danger">
          Déconnexion
        </button>
      </div>
    </div>
  );
}
