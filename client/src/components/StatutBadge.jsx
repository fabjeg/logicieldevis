const STYLES = {
  brouillon: 'bg-pending-soft text-pending',
  envoyé: 'bg-accent-soft text-accent',
  accepté: 'bg-success-soft text-success',
  refusé: 'bg-danger-soft text-danger',
};

const LABELS = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  accepté: 'Accepté',
  refusé: 'Refusé',
};

export default function StatutBadge({ statut }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${STYLES[statut] ?? 'bg-pending-soft text-pending'}`}
    >
      {LABELS[statut] ?? statut}
    </span>
  );
}
