import { useState } from 'react';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = (message, details = '') =>
    new Promise((resolve) => setState({ message, details, resolve }));

  const handle = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const Modal = state ? (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface rounded-card shadow-tab w-full max-w-sm p-6">
        <h3 className="font-bold text-ink text-base tracking-tightest">{state.message}</h3>
        {state.details && (
          <p className="text-sm text-muted mt-1.5">{state.details}</p>
        )}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={() => handle(false)}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-muted bg-page rounded-field"
          >
            Annuler
          </button>
          <button
            onClick={() => handle(true)}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-danger text-white rounded-field"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Modal };
}
