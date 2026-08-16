import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';

// ── Icônes (SVG inline, trait 1.9) ───────────────────────────────────────────
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Icons = {
  rapide: (p) => (
    <svg {...iconProps} {...p}><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" /></svg>
  ),
  devis: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  clients: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M21 20v-1a4 4 0 0 0-3-3.85" />
    </svg>
  ),
  bilan: (p) => (
    <svg {...iconProps} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  ),
  reglages: (p) => (
    <svg {...iconProps} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 2.6 14H2.5a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4 7.4l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 17 4.6a1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 21.4 9H21.5a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  ),
};

const NAV = [
  { to: '/devis/rapide', label: 'Rapide', icon: 'rapide' },
  { to: '/devis', label: 'Devis', icon: 'devis', end: true },
  { to: '/clients', label: 'Clients', icon: 'clients' },
  { to: '/dashboard', label: 'Bilan', icon: 'bilan' },
  { to: '/parametres', label: 'Réglages', icon: 'reglages' },
];

// Écrans où l'on propose un bouton flottant de création
const FAB_ROUTES = {
  '/devis': '/devis/nouveau',
  '/clients': '/clients/nouveau',
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const fabTarget = FAB_ROUTES[location.pathname];

  return (
    <div className="h-screen bg-page flex justify-center">
      <div className="w-full max-w-[480px] h-screen relative flex flex-col bg-page">
        <main className="flex-1 overflow-y-auto pb-32">
          <Outlet />
        </main>

        {/* Bouton flottant de création (contextuel) */}
        {fabTarget && (
          <button
            onClick={() => navigate(fabTarget)}
            aria-label="Créer"
            className="absolute bottom-[96px] right-5 z-20 w-14 h-14 rounded-[20px] bg-accent-gradient text-white shadow-fab flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {/* Tab bar flottante */}
        <nav className="absolute bottom-0 left-0 right-0 px-[14px] pb-[max(14px,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto bg-surface rounded-[24px] shadow-tab flex items-center justify-between px-2 py-2">
            {NAV.map(({ to, label, icon, end }) => {
              const IconCmp = Icons[icon];
              return (
                <NavLink key={to} to={to} end={end} className="flex-1">
                  {({ isActive }) => (
                    <div
                      className={`flex flex-col items-center gap-0.5 py-1.5 rounded-[16px] transition-colors ${
                        isActive ? 'bg-accent-soft text-accent' : 'text-muted'
                      }`}
                    >
                      <IconCmp />
                      <span className="text-[10px] font-semibold leading-none">{label}</span>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
