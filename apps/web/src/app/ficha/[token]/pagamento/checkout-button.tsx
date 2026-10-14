'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface CheckoutButtonProps {
  fichaId: string;
}

export function CheckoutButton({ fichaId }: CheckoutButtonProps) {
  const [plano, setPlano] = useState<'essencial' | 'completo'>('essencial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados da cobrança PIX
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [tokenFicha, setTokenFicha] = useState<string | null>(null);
  const [pixCopiaCola, setPixCopiaCola] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pago, setPago] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

      setPedidoId(data.pedido_id);
      setTokenFicha(data.token_ficha);
      setPixCopiaCola(data.pix_copia_cola);
      setPixQrCode(data.pix_qr_code);
      setCheckoutUrl(data.checkout_url || '');

      // Inicia polling de verificação de pagamento
      iniciarPolling(data.pedido_id);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function checarStatus(id: string, simular = false) {
    try {
      setVerificando(true);
      const url = `/api/pagamento?pedido_id=${id}${simular ? '&simular_pagamento=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.pago) {
          setPago(true);
          if (data.token_ficha) {
            setTokenFicha(data.token_ficha);
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao verificar status do pagamento:', e);
    } finally {
      setVerificando(false);
    }
  }

  function iniciarPolling(id: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      checarStatus(id, false);
    }, 3500);
  }

  function copiarPix() {
    if (pixCopiaCola) {
      navigator.clipboard.writeText(pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  }

  // Se o pagamento já foi confirmado
  if (pago) {
    return (
      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
          ✓
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900">Pagamento Confirmado!</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Seu diagnóstico foi liberado. Agora você pode responder às <strong>perguntas estratégicas</strong> da ficha técnica para geração do laudo de conformidade.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={tokenFicha ? `/ficha/${tokenFicha}` : `/portal`}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-md"
          >
            <span>Acessar Ficha & Perguntas Estratégicas →</span>
          </Link>
        </div>
      </div>
    );
  }

  // Se a cobrança PIX já foi gerada
  if (pixCopiaCola) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>Cobrança PIX Gerada com Sucesso</span>
          <span className="font-bold text-sm">
            R$ {plano === 'completo' ? '29,90' : '19,90'}
          </span>
        </div>

        {/* QR Code */}
        {pixQrCode && (
          <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-inner w-fit mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixQrCode} alt="QR Code PIX" className="w-48 h-48 rounded-lg object-contain" />
            <span className="text-[11px] text-slate-500 mt-2 font-medium">
              Abra o app do seu banco e escaneie o QR Code
            </span>
          </div>
        )}

        {/* Copia e Cola */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Código PIX Copia e Cola:
          </label>
          <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700 break-all select-all border border-slate-200 max-h-20 overflow-y-auto">
            {pixCopiaCola}
          </div>
          <button
            type="button"
            onClick={copiarPix}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{copiado ? '✓ Código Copiado!' : '📋 Copiar Código PIX'}</span>
          </button>
        </div>

        {/* Status de Polling */}
        <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 text-xs text-blue-900 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Aguardando confirmação bancária em tempo real...</span>
        </div>

        {/* Ações */}
        <div className="pt-2 flex flex-col gap-2 text-center">
          <button
            type="button"
            disabled={verificando}
            onClick={() => pedidoId && checarStatus(pedidoId, false)}
            className="text-xs text-blue-700 hover:text-blue-900 font-bold py-1.5 underline underline-offset-2"
          >
            {verificando ? 'Consultando status no banco...' : 'Já realizei o PIX, verificar agora'}
          </button>

          {checkoutUrl && !checkoutUrl.includes('pagamento_pendente') && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Ou pagar via Cartão / Boleto no Asaas ↗
            </a>
          )}

          {/* Botão de teste para homologação */}
          <button
            type="button"
            onClick={() => pedidoId && checarStatus(pedidoId, true)}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-medium py-1"
          >
            [Ambiente de Teste] Simular Aprovação Imediata
          </button>
        </div>
      </div>
    );
  }

  // Formulário padrão de escolha do plano e checkout inicial
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
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando Cobrança PIX...
          </span>
        ) : (
          <span>Pagar R$ {plano === 'completo' ? '29,90' : '19,90'} via PIX Imediato</span>
        )}
      </button>
    </div>
  );
}
