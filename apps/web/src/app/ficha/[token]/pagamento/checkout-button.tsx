'use client';

import { useState } from 'react';

interface CheckoutButtonProps {
  fichaId: string;
}

export function CheckoutButton({ fichaId }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGerarPagamento() {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha_id: fichaId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao gerar pagamento');
      }

      if (data.checkout_url) {
        // Redireciona para o checkout do Asaas (Fatura / Pix)
        window.location.href = data.checkout_url;
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      <button
        onClick={handleGerarPagamento}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando Fatura...
          </span>
        ) : (
          'Gerar Fatura (PIX)'
        )}
      </button>
    </div>
  );
}
