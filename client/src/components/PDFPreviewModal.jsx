import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function PDFPreviewModal({ devisId, numero, onClose }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const urlRef = useRef(null);

  useEffect(() => {
    api
      .get(`/devis/${devisId}/pdf`, { responseType: 'blob' })
      .then((r) => {
        const objectUrl = URL.createObjectURL(r.data);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => setError('Impossible de générer le PDF'))
      .finally(() => setLoading(false));

    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [devisId]);

  const telecharger = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${numero || 'devis'}.pdf`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-card w-full max-w-4xl h-[90vh] flex flex-col shadow-tab overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-page flex-shrink-0">
          <h3 className="font-bold text-ink">
            Aperçu — <span className="font-mono text-sm text-muted">{numero || 'Brouillon'}</span>
          </h3>
          <div className="flex items-center gap-2">
            {url && (
              <button
                onClick={telecharger}
                className="px-4 py-2 text-sm bg-accent-gradient text-white rounded-field font-semibold shadow-fab"
              >
                Télécharger
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-muted hover:text-ink text-xl rounded-field hover:bg-page"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden bg-page">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted text-sm">
              <div className="w-6 h-6 border-2 border-faint border-t-accent rounded-full animate-spin" />
              Génération du PDF…
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-danger text-sm">{error}</div>
          )}
          {url && (
            <iframe src={url} className="w-full h-full border-0" title="Aperçu PDF" />
          )}
        </div>
      </div>
    </div>
  );
}
