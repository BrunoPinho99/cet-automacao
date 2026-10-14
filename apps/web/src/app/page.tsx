'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SstScoreGauge } from '@/components/sst-score-gauge';

interface EmpresaItem {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  cidade: string;
  uf: string;
  cnae?: string;
  cnae_descricao?: string;
  porte?: string;
  grau_risco?: number;
  origem?: 'receita_federal' | 'local' | 'demo';
  logradouro?: string;
  bairro?: string;
}

export default function HomePage() {
  // Modo de busca: 'nome' (busca fácil por nome da empresa) ou 'cnpj' (inserção direta do CNPJ)
  const [modoBusca, setModoBusca] = useState<'nome' | 'cnpj'>('nome');
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [sugestoes, setSugestoes] = useState<EmpresaItem[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaItem | null>(null);
  const [scoreCalculado, setScoreCalculado] = useState<number | null>(null);

  // Estados do Modal de Checkout R$ 19,90
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [gerandoCheckout, setGerandoCheckout] = useState(false);
  const [whatsappLead, setWhatsappLead] = useState('');
  const [nomeLead, setNomeLead] = useState('');
  const [emailLead, setEmailLead] = useState('');
  const [pixCopiaCola, setPixCopiaCola] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [tokenFicha, setTokenFicha] = useState<string | null>(null);
  const [pagamentoConcluido, setPagamentoConcluido] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa timer de polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca em tempo real (Debounce)
  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setSugestoes([]);
      setMostrarDropdown(false);
      setBuscandoReceita(false);
      return;
    }

    const apenasDigitos = termo.replace(/\D/g, '');
    const isCnpjCompleto = apenasDigitos.length === 14;

    if (isCnpjCompleto) {
      setBuscandoReceita(true);
    }

    const delay = isCnpjCompleto ? 80 : 300;

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/empresas/busca?q=${encodeURIComponent(termo)}`);
        if (res.ok) {
          const data = await res.json();
          const lista = data.resultados || [];
          setSugestoes(lista);
          setMostrarDropdown(true);

          // Se digitou 14 dígitos de CNPJ exatos e veio apenas 1 resultado oficial, autovincula
          if (isCnpjCompleto && lista.length === 1) {
            handleSelecionarEmpresa(lista[0]);
          }
        }
      } catch (err) {
        console.error('Erro na busca de empresas:', err);
      } finally {
        setBuscando(false);
        setBuscandoReceita(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [busca]);

  // Ao selecionar uma empresa na lista de busca
  const handleSelecionarEmpresa = (empresa: EmpresaItem) => {
    setEmpresaSelecionada(empresa);
    setBusca(empresa.razao_social);
    setMostrarDropdown(false);

    // Geração do SCORE GRATUITO na hora:
    const risco = empresa.grau_risco || 2;
    let baseScore = 28;
    if (risco >= 3) {
      baseScore = 24;
    } else if (risco === 1) {
      baseScore = 34;
    }
    setScoreCalculado(baseScore);
  };

  const handleLimparBusca = () => {
    setBusca('');
    setEmpresaSelecionada(null);
    setScoreCalculado(null);
    setSugestoes([]);
  };

  const handleAbrirCheckout = () => {
    setModalCheckoutAberto(true);
    setPagamentoConcluido(false);
  };

  // Disparar geração de PIX e iniciar acompanhamento
  const handleGerarPix = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = whatsappLead.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('Por favor, informe um WhatsApp válido para receber o diagnóstico.');
      return;
    }

    setGerandoCheckout(true);
    try {
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: 'essencial',
          empresa: empresaSelecionada?.razao_social,
          cnpj: empresaSelecionada?.cnpj,
          whatsapp: whatsappLead,
          nome: nomeLead || 'Responsável',
          email: emailLead || undefined,
        }),
      });

      if (!res.ok) {
        const erroJson = await res.json().catch(() => ({}));
        throw new Error(erroJson.erro || 'Falha ao processar pagamento');
      }

      const data = await res.json();
      setPedidoId(data.pedido_id);
      setTokenFicha(data.token_ficha);
      setPixCopiaCola(data.pix_copia_cola);
      setPixQrCode(data.pix_qr_code);
      setCheckoutUrl(data.checkout_url || '');

      // Inicia polling automático do status de pagamento
      iniciarPollingPagamento(data.pedido_id);
    } catch (err: any) {
      console.error('Erro ao gerar pagamento:', err);
      alert(err.message || 'Erro ao gerar cobrança. Tente novamente.');
    } finally {
      setGerandoCheckout(false);
    }
  };

  // Consultar status do pagamento (Polling ou Manual)
  const checarStatusPagamento = async (id: string, simular = false) => {
    try {
      setVerificandoPagamento(true);
      const url = `/api/pagamento?pedido_id=${id}${simular ? '&simular_pagamento=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.pago) {
          setPagamentoConcluido(true);
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
      setVerificandoPagamento(false);
    }
  };

  const iniciarPollingPagamento = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      checarStatusPagamento(id, false);
    }, 3500);
  };

  const copiarPix = () => {
    if (pixCopiaCola) {
      navigator.clipboard.writeText(pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* CABEÇALHO INSTITUCIONAL */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-cet.png" alt="CET" className="w-9 h-9 rounded-md object-contain" />
          <div className="leading-tight">
            <span className="block text-sm font-bold text-slate-900">CET</span>
            <span className="block text-xs text-slate-500">Segurança e Medicina do Trabalho</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 transition"
          >
            Acesso Equipe / Login
          </Link>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-8">
        {/* Título de Apresentação */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Consulta Oficial Gratuita
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Descubra o <span className="text-blue-600">Score SST</span> da sua Empresa
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Identifique o nível de risco ocupacional (NR-4) e pendências com as Normas Regulamentadoras da CLT e o eSocial.
          </p>
        </div>

        {/* ÁREA DE BUSCA INTELIGENTE: NOME OU CNPJ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative" ref={dropdownRef}>
          {/* SELETOR DE MODO: BUSCAR POR NOME OU DIGITAR CNPJ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => {
                  setModoBusca('nome');
                  setBusca('');
                  setSugestoes([]);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoBusca === 'nome'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔍 Buscar pelo Nome da Empresa
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoBusca('cnpj');
                  setBusca('');
                  setSugestoes([]);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoBusca === 'cnpj'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 Digitar / Colar CNPJ
              </button>
            </div>

            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Base Nacional Oficial (Receita Federal)
            </span>
          </div>

          {/* CAMPO DE ENTRADA */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {buscando ? (
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>

              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  const val = e.target.value;
                  if (modoBusca === 'cnpj') {
                    // Máscara automática de CNPJ
                    const digitos = val.replace(/\D/g, '').slice(0, 14);
                    if (digitos.length <= 2) setBusca(digitos);
                    else if (digitos.length <= 5) setBusca(`${digitos.slice(0, 2)}.${digitos.slice(2)}`);
                    else if (digitos.length <= 8) setBusca(`${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`);
                    else if (digitos.length <= 12) setBusca(`${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`);
                    else setBusca(`${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`);
                  } else {
                    setBusca(val);
                  }
                }}
                onFocus={() => {
                  if (sugestoes.length > 0) setMostrarDropdown(true);
                }}
                placeholder={
                  modoBusca === 'nome'
                    ? 'Digite o nome da sua empresa (ex: Padaria Central, Drogaria Pacheco)...'
                    : 'Cole ou digite o CNPJ (ex: 12.345.678/0001-90)...'
                }
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl text-sm sm:text-base text-slate-900 transition-all outline-hidden font-medium placeholder:text-slate-400"
              />

              {busca && (
                <button
                  type="button"
                  onClick={handleLimparBusca}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  title="Limpar campo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={buscando}
              onClick={async () => {
                const termo = busca.trim();
                if (termo.length < 2) return;
                setBuscando(true);
                setBuscandoReceita(true);
                try {
                  const res = await fetch(`/api/empresas/busca?q=${encodeURIComponent(termo)}`);
                  if (res.ok) {
                    const data = await res.json();
                    const lista = data.resultados || [];
                    setSugestoes(lista);
                    if (lista.length === 1) {
                      handleSelecionarEmpresa(lista[0]);
                    } else if (lista.length > 1) {
                      setMostrarDropdown(true);
                    }
                  }
                } catch (e) {
                  console.error('Erro na consulta manual:', e);
                } finally {
                  setBuscando(false);
                  setBuscandoReceita(false);
                }
              }}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition shadow-sm hover:shadow shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {buscando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <span>{modoBusca === 'nome' ? 'Buscar Empresa' : 'Consultar CNPJ'}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* STATUS DE CONSULTA NA RECEITA FEDERAL */}
          {buscandoReceita && (
            <div className="mt-2.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
              <svg className="animate-spin h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Consultando dados cadastrais, CNAE e Grau de Risco na Receita Federal do Brasil...</span>
            </div>
          )}

          {/* LINKS DE ALTERNÂNCIA E AJUDA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-500">
            {modoBusca === 'nome' ? (
              <button
                type="button"
                onClick={() => {
                  setModoBusca('cnpj');
                  setBusca('');
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 text-left"
              >
                Não encontrou pelo nome? Digite o CNPJ diretamente aqui →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setModoBusca('nome');
                  setBusca('');
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 text-left"
              >
                Prefere buscar pelo nome fantasia da empresa? Clique aqui →
              </button>
            )}

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent('consultar cnpj ' + (busca || 'minha empresa'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Consultar no Google ↗
            </a>
          </div>

          {/* DROPDOWN DE SUGESTÕES */}
          {mostrarDropdown && (
            <div className="absolute left-6 right-6 top-[138px] z-20 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-fade-in divide-y divide-slate-100">
              {sugestoes.length > 0 ? (
                <>
                  <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{sugestoes.length} {sugestoes.length === 1 ? 'Empresa encontrada' : 'Empresas encontradas'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clique para vincular e gerar score</span>
                  </div>

                  {sugestoes.map((emp, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelecionarEmpresa(emp)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50/80 transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-slate-900 group-hover:text-blue-700 truncate">
                            {emp.razao_social}
                          </div>
                          {emp.origem === 'receita_federal' && (
                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                              Receita Federal
                            </span>
                          )}
                          {emp.origem === 'local' && (
                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md">
                              Base Integrada
                            </span>
                          )}
                        </div>

                        {emp.nome_fantasia && emp.nome_fantasia !== emp.razao_social && (
                          <div className="text-xs text-slate-500 font-medium">
                            Nome fantasia: {emp.nome_fantasia}
                          </div>
                        )}
                        {emp.cnae_descricao && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {emp.cnae_descricao}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 group-hover:bg-blue-100 text-[11px] font-mono font-semibold text-slate-700 group-hover:text-blue-800">
                          {emp.cnpj}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {emp.cidade} - {emp.uf}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : !buscando && busca.trim().length >= 3 ? (
                <div className="p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-base">
                    🔍
                  </div>
                  {modoBusca === 'nome' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 font-medium">
                        Não encontramos empresas pelo termo <strong>&quot;{busca}&quot;</strong> na amostragem rápida.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModoBusca('cnpj');
                          setBusca('');
                          setSugestoes([]);
                          setMostrarDropdown(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <span>🏢 Digitar ou Colar CNPJ Diretamente (100% Preciso)</span>
                        <span>→</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 font-medium">
                        CNPJ: <strong className="font-mono">{busca}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelecionarEmpresa({
                            cnpj: busca,
                            razao_social: `Empresa CNPJ ${busca}`,
                            cidade: 'São Paulo',
                            uf: 'SP',
                            grau_risco: 2,
                            origem: 'receita_federal',
                          });
                          setMostrarDropdown(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <span>✓ Continuar com este CNPJ e Avançar</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* CARD DA EMPRESA VINCULADA */}
          {empresaSelecionada && (
            <div className="mt-5 p-4 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-blue-200">
                    ✓ Empresa Vinculada
                  </span>
                  {empresaSelecionada.origem === 'receita_federal' && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      🟢 Base Oficial da Receita Federal
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {empresaSelecionada.razao_social}
                </h3>
                {empresaSelecionada.nome_fantasia && empresaSelecionada.nome_fantasia !== empresaSelecionada.razao_social && (
                  <p className="text-xs text-slate-600 font-medium">
                    Nome Fantasia: {empresaSelecionada.nome_fantasia}
                  </p>
                )}
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                  <span>CNPJ: <strong className="font-mono text-slate-800">{empresaSelecionada.cnpj}</strong></span>
                  <span>Localização: <strong>{empresaSelecionada.cidade} - {empresaSelecionada.uf}</strong></span>
                  {empresaSelecionada.cnae_descricao && (
                    <span className="w-full sm:w-auto truncate">Atividade: <strong>{empresaSelecionada.cnae_descricao}</strong></span>
                  )}
                  {empresaSelecionada.porte && (
                    <span>Porte: <strong>{empresaSelecionada.porte}</strong></span>
                  )}
                  {empresaSelecionada.grau_risco && (
                    <span>Risco NR-4: <strong>Grau {empresaSelecionada.grau_risco}</strong></span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLimparBusca}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2 shrink-0 py-1"
              >
                Trocar empresa
              </button>
            </div>
          )}
        </div>

        {/* ÁREA DO VELOCÍMETRO / MEDIDOR EM GRADIENTE COM SCORE BAIXO */}
        {scoreCalculado !== null && empresaSelecionada && (
          <div className="space-y-6 animate-fade-in">
            <SstScoreGauge
              score={scoreCalculado}
              empresaNome={empresaSelecionada.razao_social}
              cnpj={empresaSelecionada.cnpj}
              onContratarDiagnostico={handleAbrirCheckout}
            />
          </div>
        )}

        {/* SE NÃO PESQUISOU NADA AINDA: EXEMPLOS E APRESENTAÇÃO */}
        {!empresaSelecionada && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Empresas em destaque para consulta imediata:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { nome: 'Metalúrgica Aliança & Soldas Ltda', cnpj: '12.345.678/0001-90', cidade: 'São Paulo - SP', ramo: 'Metalurgia / Indústria' },
                { nome: 'Construtora Horizonte Forte Ltda', cnpj: '23.456.789/0001-01', cidade: 'Curitiba - PR', ramo: 'Construção Civil' },
                { nome: 'Transportadora Rápido Brasil Ltda', cnpj: '34.567.890/0001-12', cidade: 'Campinas - SP', ramo: 'Logística e Fretes' },
                { nome: 'Padaria & Restaurante Delícias do Trigo', cnpj: '56.789.012/0001-34', cidade: 'Santos - SP', ramo: 'Alimentação' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleSelecionarEmpresa({
                      cnpj: item.cnpj,
                      razao_social: item.nome,
                      cidade: item.cidade.split(' - ')[0],
                      uf: item.cidade.split(' - ')[1],
                      cnae_descricao: item.ramo,
                      grau_risco: 3,
                    })
                  }
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                      {item.nome}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {item.cnpj} • {item.cidade}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Consultar →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CHECKOUT PIX R$ 19,90 COM POLING REAL E QR CODE */}
      {modalCheckoutAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Diagnóstico Completo SST</h3>
                  <p className="text-xs text-slate-400">Emissão oficial da CET • R$ 19,90</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalCheckoutAberto(false);
                  if (pollingRef.current) clearInterval(pollingRef.current);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Se o pagamento já foi confirmado */}
              {pagamentoConcluido ? (
                <div className="text-center py-4 space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-extrabold text-slate-900">
                      Pagamento Confirmado!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Sua empresa está vinculada. Agora responda às <strong>perguntas estratégicas</strong> da ficha técnica para emissão do laudo definitivo.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={tokenFicha ? `/ficha/${tokenFicha}` : '/ficha'}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition shadow-md"
                    >
                      <span>Acessar Ficha & Responder Perguntas Estratégicas</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : !pixCopiaCola ? (
                // FORMULÁRIO DE DADOS INICIAIS
                <form onSubmit={handleGerarPix} className="space-y-3.5">
                  <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                    <div className="font-bold text-sm text-blue-950">
                      {empresaSelecionada?.razao_social || 'Sua Empresa'}
                    </div>
                    <div>CNPJ: <span className="font-mono">{empresaSelecionada?.cnpj}</span></div>
                  </div>

                  {/* AVISO METODOLÓGICO: AS PERGUNTAS ESTRATÉGICAS CONTINUAM NA ETAPA SEGUINTE */}
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 text-xs mt-0.5">ℹ️</span>
                    <span>
                      <strong>Aviso Metodológico:</strong> O Score do CNPJ é uma análise prévia. O laudo definitivo depende do preenchimento das <strong>perguntas estratégicas de SST</strong> (equipe, laudos PGR/PCMSO e eSocial) na próxima etapa.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seu Nome Completo:
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeLead}
                      onChange={(e) => setNomeLead(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp para envio do relatório:
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsappLead}
                      onChange={(e) => setWhatsappLead(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail (opcional):
                    </label>
                    <input
                      type="email"
                      value={emailLead}
                      onChange={(e) => setEmailLead(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={gerandoCheckout}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {gerandoCheckout ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Gerando Cobrança PIX...</span>
                        </>
                      ) : (
                        <>
                          <span>Pagar R$ 19,90 via PIX Imediato</span>
                          <span className="text-emerald-200">→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // EXIBIÇÃO DO QR CODE E CHAVE PIX
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                    <span>Cobrança PIX Gerada com Sucesso</span>
                    <span className="font-bold">R$ 19,90</span>
                  </div>

                  {/* IMAGEM DO QR CODE */}
                  {pixQrCode && (
                    <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-inner w-fit mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pixQrCode}
                        alt="QR Code PIX"
                        className="w-48 h-48 rounded-lg object-contain"
                      />
                      <span className="text-[11px] text-slate-500 mt-2 font-medium">
                        Aponte a câmera do aplicativo do seu banco
                      </span>
                    </div>
                  )}

                  {/* CHAVE COPIA E COLA */}
                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      PIX Copia e Cola:
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

                  {/* INDICADOR DE AGUARDANDO PAGAMENTO */}
                  <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 text-xs text-blue-900 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Aguardando pagamento... A liberação é automática.</span>
                  </div>

                  {/* BOTÕES DE AÇÃO: VERIFICAR MANUALMENTE E SIMULAR (TESTES) */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={verificandoPagamento}
                      onClick={() => pedidoId && checarStatusPagamento(pedidoId, false)}
                      className="text-xs text-blue-700 hover:text-blue-900 font-bold py-1.5 underline underline-offset-2"
                    >
                      {verificandoPagamento ? 'Verificando no banco...' : 'Já paguei, verificar agora'}
                    </button>

                    {/* Botão de simulação segura em homologação/testes */}
                    <button
                      type="button"
                      onClick={() => pedidoId && checarStatusPagamento(pedidoId, true)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-medium py-1"
                    >
                      [Modo Teste] Simular Aprovação Imediata
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ INSTITUCIONAL */}
      <footer className="mt-auto border-t border-slate-200 py-6 px-4 bg-white text-center text-xs text-slate-500">
        <p>CET — Clínica Especializada no Trabalho • Segurança e Medicina Ocupacional</p>
        <p className="mt-1 text-[11px] text-slate-400">Atendimento a empresas em conformidade com as Normas Regulamentadoras (NRs) e eSocial.</p>
      </footer>
    </div>
  );
}
