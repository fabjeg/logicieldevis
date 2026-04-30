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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 text-base">{state.message}</h3>
        {state.details && (
          <p className="text-sm text-gray-500 mt-1.5">{state.details}</p>
        )}
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={() => handle(false)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => handle(true)}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Modal };
}
