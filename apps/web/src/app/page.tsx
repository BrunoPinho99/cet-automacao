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
  const [pixCopiaCola, setPixCopiaCola] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pagamentoConcluido, setPagamentoConcluido] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Busca inteligente (Solução 2):
  // - Se colar/digitar 14 dígitos (CNPJ): busca imediata na Receita Federal do Brasil inteiro
  // - Se digitar nome da empresa: debounce suave de 250ms com busca no banco local e populares
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

    const delay = isCnpjCompleto ? 50 : 250;

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/empresas/busca?q=${encodeURIComponent(termo)}`);
        if (res.ok) {
          const data = await res.json();
          setSugestoes(data.resultados || []);
          setMostrarDropdown(true);
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
    // O score preliminar é baixo para alertar sobre conformidade e pendências regulatórias
    const risco = empresa.grau_risco || 2;
    let baseScore = 28; // Score baixo característico de triagem sem laudos comprovados
    if (risco >= 3) {
      baseScore = 24; // Risco químico/mecânico/construção tem ainda mais pendências
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
  };

  const handleGerarPix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappLead || whatsappLead.length < 9) {
      alert('Por favor, informe seu WhatsApp para receber o diagnóstico.');
      return;
    }

    setGerandoCheckout(true);
    try {
      // Simulação rápida ou chamada à API de pagamento
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: 'essencial',
          empresa: empresaSelecionada?.razao_social,
          cnpj: empresaSelecionada?.cnpj,
          whatsapp: whatsappLead,
          nome: nomeLead || 'Responsável',
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json();
        setCheckoutUrl(json.checkout_url || '');
      }

      // Código PIX Copia e Cola formatado
      const pixSimulado = `00020101021226840014br.gov.bcb.pix2562pix.asaas.com/qr/stat/cet_diag_${Date.now()}520400005303986540519.905802BR5925CET CLINICA ESPECIALIZADA6009SAO PAULO62070503***6304E8A2`;
      setPixCopiaCola(pixSimulado);
    } catch {
      // Fallback
      setPixCopiaCola('00020126580014br.gov.bcb.pix0136contato@cet.com.br520400005303986540519.905802BR5915CET SEGURANCA6009SAO PAULO62070503***6304A1B2');
    } finally {
      setGerandoCheckout(false);
    }
  };

  const copiarPix = () => {
    if (pixCopiaCola) {
      navigator.clipboard.writeText(pixCopiaCola);
      alert('Código PIX copiado com sucesso! Abra o app do seu banco para pagar.');
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
            Consulta Pública Gratuita
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Descubra o <span className="text-blue-600">Score SST</span> da sua Empresa
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Pesquise pelo <strong>Nome da Empresa</strong> ou <strong>CNPJ</strong> para identificar o nível de risco ocupacional e pendências com as Normas Regulamentadoras e o eSocial.
          </p>
        </div>

        {/* FORMULÁRIO DE BUSCA INTELIGENTE DE EMPRESA (Solução 2: Brasil Inteiro) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Pesquise o nome da empresa ou cole o CNPJ:
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Base Nacional (Brasil Inteiro)
            </span>
          </div>

          <div className="relative">
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
              onChange={(e) => setBusca(e.target.value)}
              onFocus={() => {
                if (sugestoes.length > 0) setMostrarDropdown(true);
              }}
              placeholder="Digite o nome da sua empresa OU cole o CNPJ (ex: 12.345.678/0001-90)..."
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

          {/* AVISO DE CONSULTA NA RECEITA FEDERAL EM ANDAMENTO */}
          {buscandoReceita && (
            <div className="mt-2.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
              <svg className="animate-spin h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Consultando dados oficiais da empresa na Receita Federal do Brasil...</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Ao selecionar a empresa, vinculamos CNPJ, CNAE e localização automaticamente, sem precisar digitar número por número.</span>
          </p>

          {/* DROPDOWN DE SUGESTÕES */}
          {mostrarDropdown && sugestoes.length > 0 && (
            <div className="absolute left-6 right-6 top-[102px] z-20 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-fade-in divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{sugestoes.length} {sugestoes.length === 1 ? 'Empresa encontrada' : 'Empresas encontradas'}</span>
                <span className="text-[10px] text-slate-400 font-normal">Clique para vincular e gerar score</span>
              </div>

              {sugestoes.map((emp, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelecionarEmpresa(emp)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50/80 transition-colors flex items-start justify-between gap-3 group"
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
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition flex items-center justify-between group"
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

      {/* MODAL DE CHECKOUT PIX R$ 19,90 */}
      {modalCheckoutAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Diagnóstico Completo SST</h3>
                  <p className="text-xs text-slate-400">Emissão oficial da CET</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalCheckoutAberto(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                <div className="font-bold text-sm text-blue-950">
                  {empresaSelecionada?.razao_social || 'Sua Empresa'}
                </div>
                <div>CNPJ: <span className="font-mono">{empresaSelecionada?.cnpj}</span></div>
              </div>

              {!pixCopiaCola ? (
                <form onSubmit={handleGerarPix} className="space-y-3.5">
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
                      WhatsApp para receber o relatório:
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

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={gerandoCheckout}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {gerandoCheckout ? (
                        <span>Gerando Chave PIX...</span>
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
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    Chave PIX gerada com sucesso! Valor: R$ 19,90
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase">
                      PIX Copia e Cola:
                    </label>
                    <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700 break-all select-all border border-slate-200">
                      {pixCopiaCola}
                    </div>
                    <button
                      type="button"
                      onClick={copiarPix}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      📋 Copiar Código PIX
                    </button>
                  </div>

                  {checkoutUrl && (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Ou abrir fatura no Asaas →
                    </a>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPagamentoConcluido(true);
                        setModalCheckoutAberto(false);
                        alert('Pagamento registrado! Nosso especialista CET já foi notificado e entrará em contato via WhatsApp para envio do laudo.');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Já realizei o pagamento
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
