'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface CheckoutButtonProps {
  fichaId: string;
  token?: string;
  onSucesso?: () => void;
}

export function CheckoutButton({ fichaId, token, onSucesso }: CheckoutButtonProps) {
  const [metodo, setMetodo] = useState<'pix' | 'cartao'>('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dados do Cartão de Crédito
  const [numeroCartao, setNumeroCartao] = useState('');
  const [nomeCartao, setNomeCartao] = useState('');
  const [validadeCartao, setValidadeCartao] = useState('');
  const [cvvCartao, setCvvCartao] = useState('');
  const [cpfCartao, setCpfCartao] = useState('');
  const [cepCartao, setCepCartao] = useState('');

  // Estados da cobrança PIX e Pedido
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [tokenFicha, setTokenFicha] = useState<string | null>(token || null);
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

  // Formatações auxiliares
  function formatarNumeroCartao(val: string) {
    const digitos = val.replace(/\D/g, '').slice(0, 16);
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatarValidade(val: string) {
    const digitos = val.replace(/\D/g, '').slice(0, 4);
    if (digitos.length <= 2) return digitos;
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  function formatarCpf(val: string) {
    const digitos = val.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  // Gera pagamento via PIX ou Cartão
  async function handleGerarPagamento(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const bodyPayload: any = {
        ficha_id: fichaId,
        plano: 'completo',
        metodo,
      };

      if (metodo === 'cartao') {
        if (!numeroCartao.replace(/\D/g, '') || numeroCartao.replace(/\D/g, '').length < 13) {
          throw new Error('Informe um número de cartão de crédito válido.');
        }
        if (!nomeCartao.trim()) {
          throw new Error('Informe o nome impresso no cartão.');
        }
        if (!validadeCartao.includes('/') || validadeCartao.replace(/\D/g, '').length < 4) {
          throw new Error('Informe a validade do cartão (MM/AA).');
        }
        if (!cvvCartao.trim() || cvvCartao.length < 3) {
          throw new Error('Informe o código de segurança (CVV).');
        }
        if (!cpfCartao.replace(/\D/g, '') || cpfCartao.replace(/\D/g, '').length < 11) {
          throw new Error('Informe o CPF do titular do cartão.');
        }

        bodyPayload.cartao = {
          numero: numeroCartao,
          nomeTitular: nomeCartao,
          validade: validadeCartao,
          cvv: cvvCartao,
          cpfTitular: cpfCartao,
          cep: cepCartao,
        };
      }

      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Falha ao processar pagamento com Asaas');
      }

      setPedidoId(data.pedido_id);
      if (data.token_ficha) {
        setTokenFicha(data.token_ficha);
      }
      setCheckoutUrl(data.checkout_url || '');

      // Se pagou no cartão e já foi aprovado na hora
      if (data.pago) {
        setPago(true);
        onSucesso?.();
        return;
      }

      // Se for PIX
      setPixCopiaCola(data.pix_copia_cola || '');
      setPixQrCode(data.pix_qr_code || '');

      // Inicia polling de verificação automática
      iniciarPolling(data.pedido_id);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao processar o pagamento.');
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
          onSucesso?.();
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
    }, 3000);
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
      <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-4 animate-fade-in shadow-sm">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
          ✓
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900">Pagamento Confirmado!</h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Seu <strong>Diagnóstico Completo SST</strong> foi liberado com sucesso.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={tokenFicha ? `/ficha/${tokenFicha}` : `/portal`}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-sm sm:text-base transition shadow-md"
          >
            <span>Acessar Ficha & Laudo Completo →</span>
          </Link>
        </div>
      </div>
    );
  }

  // Se a cobrança PIX foi gerada e está aguardando pagamento
  if (pixCopiaCola && metodo === 'pix') {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Asaas Pagamentos</span>
            <span className="font-extrabold text-sm sm:text-base">PIX Imediato Gerado</span>
          </div>
          <span className="text-xl font-black text-emerald-800">R$ 19,90</span>
        </div>

        {/* QR Code */}
        {pixQrCode && (
          <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-3xl shadow-xs w-fit mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixQrCode} alt="QR Code PIX Asaas" className="w-52 h-52 rounded-xl object-contain" />
            <span className="text-xs text-slate-500 mt-2 font-medium">
              Abra o app do seu banco e escaneie o código acima
            </span>
          </div>
        )}

        {/* Copia e Cola */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Código PIX Copia e Cola:
          </label>
          <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 break-all select-all border border-slate-200 max-h-24 overflow-y-auto">
            {pixCopiaCola}
          </div>
          <button
            type="button"
            onClick={copiarPix}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>{copiado ? '✓ Código Copiado com Sucesso!' : '📋 Copiar Código PIX'}</span>
          </button>
        </div>

        {/* Status de Polling em tempo real */}
        <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span>Aguardando confirmação do banco...</span>
          </div>
          <button
            type="button"
            onClick={() => pedidoId && checarStatus(pedidoId, false)}
            disabled={verificando}
            className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
          >
            {verificando ? 'Checando...' : 'Verificar agora'}
          </button>
        </div>

        {/* Link para Fatura Oficial Asaas */}
        {checkoutUrl && !checkoutUrl.includes('pagamento_pendente') && (
          <div className="text-center pt-1">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Ou abrir fatura no portal oficial do Asaas ↗
            </a>
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setPixCopiaCola('');
              setPixQrCode('');
            }}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Trocar forma de pagamento
          </button>
        </div>
      </div>
    );
  }

  // Formulário padrão de Checkout Transparente Asaas (PIX e Cartão)
  return (
    <div className="w-full space-y-5">
      {/* Resumo do Pedido */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div>
          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            Diagnóstico Completo SST
          </span>
          <h4 className="text-sm font-bold text-slate-900">Laudo Técnico + Relatório Executivo</h4>
          <p className="text-xs text-slate-500">Liberação imediata após confirmação</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 line-through">De R$ 99,00</span>
          <p className="text-2xl font-black text-emerald-700">R$ 19,90</p>
          <span className="text-[10px] text-slate-500">Taxa única</span>
        </div>
      </div>

      {/* Seletor de Método de Pagamento (Tabs) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMetodo('pix');
            setError('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            metodo === 'pix'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚡ PIX Imediato</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMetodo('cartao');
            setError('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            metodo === 'cartao'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>💳 Cartão de Crédito</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* ABA 1: PIX */}
      {metodo === 'pix' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 text-xs text-emerald-900 space-y-1">
            <p className="font-bold">Aprovação em segundos via Banco Central (Asaas)</p>
            <p className="text-[11px] text-emerald-800">
              Ao clicar no botão abaixo, geramos o QR Code dinâmico e o código Copia e Cola para pagamento imediato no seu banco.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleGerarPagamento()}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Conectando ao Asaas...</span>
              </>
            ) : (
              <>
                <span>Pagar R$ 19,90 via PIX Imediato</span>
                <span className="text-emerald-200">→</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ABA 2: CARTÃO DE CRÉDITO (CHECKOUT TRANSPARENTE) */}
      {metodo === 'cartao' && (
        <form onSubmit={handleGerarPagamento} className="space-y-3.5">
          {/* Número do Cartão */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Número do Cartão:
            </label>
            <input
              type="text"
              required
              value={numeroCartao}
              onChange={(e) => setNumeroCartao(formatarNumeroCartao(e.target.value))}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Nome no Cartão */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Impresso no Cartão:
            </label>
            <input
              type="text"
              required
              value={nomeCartao}
              onChange={(e) => setNomeCartao(e.target.value.toUpperCase())}
              placeholder="COMO ESTÁ NO CARTÃO"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white uppercase"
            />
          </div>

          {/* Validade e CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Validade:
              </label>
              <input
                type="text"
                required
                value={validadeCartao}
                onChange={(e) => setValidadeCartao(formatarValidade(e.target.value))}
                placeholder="MM/AA"
                maxLength={5}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CVV:
              </label>
              <input
                type="password"
                required
                value={cvvCartao}
                onChange={(e) => setCvvCartao(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white text-center"
              />
            </div>
          </div>

          {/* CPF do Titular */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              CPF do Titular do Cartão:
            </label>
            <input
              type="text"
              required
              value={cpfCartao}
              onChange={(e) => setCpfCartao(formatarCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processando Cartão com Asaas...</span>
                </>
              ) : (
                <>
                  <span>Pagar R$ 19,90 no Cartão de Crédito</span>
                  <span className="text-emerald-200">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <p className="text-[11px] text-center text-slate-400">
        🔒 Pagamento 100% seguro processado pelo Asaas Instituição de Pagamento S.A.
      </p>
    </div>
  );
}
