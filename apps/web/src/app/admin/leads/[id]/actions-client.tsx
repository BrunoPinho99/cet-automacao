'use client';

import { useState } from 'react';
import { requestRegerarPdf, requestSincroniaPloomes } from './actions';

export function Actions({ empresaId, pedidoId }: { empresaId: string; pedidoId?: string }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  const regerarPdf = async () => {
    if (!pedidoId) {
      alert('Esta empresa ainda não possui um pedido pago/gerado.');
      return;
    }
    setLoadingPdf(true);
    try {
      await requestRegerarPdf(pedidoId);
      alert('Job de Regerar PDF adicionado à fila!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setLoadingPdf(false);
    }
  };

  const forcarSincronia = async () => {
    setLoadingSync(true);
    try {
      await requestSincroniaPloomes(empresaId);
      alert('Job de Sincronia Ploomes adicionado à fila!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={regerarPdf}
        disabled={loadingPdf}
        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        {loadingPdf ? 'Aguarde...' : 'Regerar PDF'}
      </button>
      <button
        onClick={forcarSincronia}
        disabled={loadingSync}
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {loadingSync ? 'Aguarde...' : 'Sincronizar Ploomes'}
      </button>
    </div>
  );
}
