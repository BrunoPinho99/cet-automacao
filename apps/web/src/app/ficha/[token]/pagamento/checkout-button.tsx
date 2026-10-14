'use client';

import { useState } from 'react';

interface CheckoutButtonProps {
  fichaId: string;
}

export function CheckoutButton({ fichaId }: CheckoutButtonProps) {
  const [plano, setPlano] = useState<'essencial' | 'completo'>('completo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGerarPagamento() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha_id: fichaId, plano }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao gerar pagamento');
      }

      if (data.checkout_url) {
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
    <div className="w-full space-y-6">
      {/* Seletor de Planos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Essencial */}
        <div
          onClick={() => setPlano('essencial')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
            plano === 'essencial'
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-800 text-sm">Diagnóstico Essencial</span>
            <input
              type="radio"
              name="plano"
              checked={plano === 'essencial'}
              onChange={() => setPlano('essencial')}
              className="text-blue-600"
            />
          </div>
          <p className="text-2xl font-black text-slate-900">R$ 19,90</p>
          <p className="text-xs text-slate-500 mt-1">
            Mapeamento básico de pendências e enquadramento de NRs.
          </p>
        </div>

        {/* Completo (Recomendado) */}
        <div
          onClick={() => setPlano('completo')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
            plano === 'completo'
              ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase">
            Mais Completo
          </span>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-800 text-sm">Diagnóstico Completo</span>
            <input
              type="radio"
              name="plano"
              checked={plano === 'completo'}
              onChange={() => setPlano('completo')}
              className="text-emerald-600"
            />
          </div>
          <p className="text-2xl font-black text-emerald-700">R$ 29,90</p>
          <p className="text-xs text-slate-500 mt-1">
            Plano de ação prioritário, checklist e análise preventiva.
          </p>
        </div>
      </div>



      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleGerarPagamento}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando Fatura Segura...
          </span>
        ) : (
          <span>Pagar R$ {plano === 'completo' ? '29,90' : '19,90'} via PIX / Cartão</span>
        )}
      </button>
    </div>
  );
}
