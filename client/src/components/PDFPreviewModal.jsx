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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-800">
            Aperçu — <span className="font-mono text-sm">{numero || 'Brouillon'}</span>
          </h3>
          <div className="flex items-center gap-2">
            {url && (
              <button
                onClick={telecharger}
                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Télécharger
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xl rounded-lg hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-gray-100">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
              Génération du PDF…
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-red-500 text-sm">{error}</div>
          )}
          {url && (
            <iframe src={url} className="w-full h-full border-0" title="Aperçu PDF" />
          )}
        </div>
      </div>
    </div>
  );
}
