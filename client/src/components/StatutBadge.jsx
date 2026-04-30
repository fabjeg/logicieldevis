const STYLES = {
  brouillon: 'bg-gray-100 text-gray-600',
  envoyé: 'bg-blue-100 text-blue-700',
  accepté: 'bg-green-100 text-green-700',
  refusé: 'bg-red-100 text-red-700',
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
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[statut] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {LABELS[statut] ?? statut}
    </span>
  );
}
