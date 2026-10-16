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

function formatarTelefoneInput(valor: string) {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

  // Estados dos Dados de Contato Obrigatórios (preenchidos antes do score)
  const [nomeLead, setNomeLead] = useState('');
  const [whatsappLead, setWhatsappLead] = useState('');
  const [emailLead, setEmailLead] = useState('');

  // Estados das Perguntas Estratégicas sobre Programas Necessários de SST
  const [temPgr, setTemPgr] = useState<'vigente' | 'vencido' | 'nao_possui' | 'nao_sei'>('nao_possui');
  const [temPcmso, setTemPcmso] = useState<'vigente' | 'vencido' | 'nao_possui' | 'nao_sei'>('nao_possui');
  const [temLtcat, setTemLtcat] = useState<'vigente' | 'vencido' | 'nao_possui' | 'nao_sei'>('nao_possui');
  const [temAso, setTemAso] = useState<'em_dia' | 'parcial' | 'nao_realiza'>('parcial');
  const [enviaEsocial, setEnviaEsocial] = useState<'transmite' | 'pendente' | 'nunca_enviou'>('nunca_enviou');
  const [qtdColaboradores, setQtdColaboradores] = useState<'1_5' | '6_20' | '21_50' | '50_plus'>('1_5');
  const [teveAcidenteOuFiscalizacao, setTeveAcidenteOuFiscalizacao] = useState<'nao' | 'sim'>('nao');

  // Estados de controle e feedback do cálculo
  const [calculandoScore, setCalculandoScore] = useState(false);
  const [pontosCriticos, setPontosCriticos] = useState<string[]>([]);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(true);

  // Estados do Modal de Checkout R$ 19,90 (PIX e Cartão Asaas)
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [metodoCheckout, setMetodoCheckout] = useState<'pix' | 'cartao'>('pix');
  const [gerandoCheckout, setGerandoCheckout] = useState(false);
  const [erroCheckout, setErroCheckout] = useState('');
  const [docPagador, setDocPagador] = useState('');

  // Dados do Cartão de Crédito
  const [numeroCartao, setNumeroCartao] = useState('');
  const [nomeCartao, setNomeCartao] = useState('');
  const [validadeCartao, setValidadeCartao] = useState('');
  const [cvvCartao, setCvvCartao] = useState('');
  const [cpfCartao, setCpfCartao] = useState('');
  const [cepCartao, setCepCartao] = useState('');

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
  const formRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

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

    // Conforme regra: NÃO exibe o score imediatamente antes do preenchimento das perguntas e contato!
    setScoreCalculado(null);
    setMostrarFormulario(true);
    setErroFormulario(null);

    // Rola suavemente até o formulário do diagnóstico
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const handleLimparBusca = () => {
    setBusca('');
    setEmpresaSelecionada(null);
    setScoreCalculado(null);
    setSugestoes([]);
    setErroFormulario(null);
    setMostrarFormulario(true);
  };

  // Submissão do formulário: validação rigorosa de contato e cálculo real do Score SST
  const handleCalcularScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroFormulario(null);

    if (!nomeLead.trim()) {
      setErroFormulario('Por favor, informe seu Nome Completo para identificação técnica.');
      return;
    }

    const cleanPhone = whatsappLead.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErroFormulario('Por favor, informe um WhatsApp válido com DDD (mínimo 10 dígitos) para receber o relatório.');
      return;
    }

    const emailLimpo = emailLead.trim();
    if (!emailLimpo || !emailLimpo.includes('@') || !emailLimpo.includes('.')) {
      setErroFormulario('Por favor, informe um e-mail válido para envio oficial do diagnóstico.');
      return;
    }

    setCalculandoScore(true);

    try {
      // Registra o lead e o contato na base de dados em segundo plano
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeLead.trim(),
          telefone: whatsappLead,
          email: emailLimpo,
          cnpj: empresaSelecionada?.cnpj,
          canal: 'formulario_web',
          primeira_intencao: 'score_sst',
        }),
      }).catch((err) => console.warn('Registro de lead:', err));

      // Simulação rápida para feedback pericial
      await new Promise((resolve) => setTimeout(resolve, 550));

      // Cálculo Real do Score com base no que o usuário respondeu
      let nota = 100;
      const pontos: string[] = [];

      // 1. PGR (NR-01)
      if (temPgr === 'nao_possui') {
        nota -= 26;
        pontos.push('Ausência de PGR (NR-01)');
      } else if (temPgr === 'vencido') {
        nota -= 16;
        pontos.push('PGR Vencido / Desatualizado');
      } else if (temPgr === 'nao_sei') {
        nota -= 12;
        pontos.push('PGR Não Comprovado');
      }

      // 2. PCMSO (NR-07)
      if (temPcmso === 'nao_possui') {
        nota -= 22;
        pontos.push('Ausência de PCMSO (NR-07)');
      } else if (temPcmso === 'vencido') {
        nota -= 14;
        pontos.push('PCMSO Vencido');
      } else if (temPcmso === 'nao_sei') {
        nota -= 10;
        pontos.push('PCMSO Não Comprovado');
      }

      // 3. Exames Médicos Ocupacionais (ASO)
      if (temAso === 'nao_realiza') {
        nota -= 18;
        pontos.push('Exames Ocupacionais (ASO) Não Realizados');
      } else if (temAso === 'parcial') {
        nota -= 10;
        pontos.push('Exames Periódicos (ASO) em Atraso');
      }

      // 4. eSocial SST (S-2210, S-2220, S-2240)
      if (enviaEsocial === 'nunca_enviou') {
        nota -= 22;
        pontos.push('eSocial SST Nunca Transmitido');
      } else if (enviaEsocial === 'pendente') {
        nota -= 14;
        pontos.push('eSocial SST Pendente de Regularização');
      }

      // 5. LTCAT / Insalubridade
      if (temLtcat === 'nao_possui') {
        nota -= 10;
        pontos.push('Ausência de LTCAT / Laudo de Riscos');
      } else if (temLtcat === 'vencido') {
        nota -= 6;
        pontos.push('LTCAT Desatualizado');
      }

      // 6. Histórico de Notificação / Acidente
      if (teveAcidenteOuFiscalizacao === 'sim') {
        nota -= 10;
        pontos.push('Histórico de Fiscalização / Acidente Recente');
      }

      // 7. Agravante por Grau de Risco do CNAE
      const risco = empresaSelecionada?.grau_risco || 2;
      if (risco >= 3 && (temPgr !== 'vigente' || temPcmso !== 'vigente')) {
        nota -= 6;
        pontos.push(`Grau de Risco Elevado (NR-4 Risco ${risco})`);
      }

      const scoreFinal = Math.max(18, Math.min(98, Math.round(nota)));
      setPontosCriticos(pontos);
      setScoreCalculado(scoreFinal);

      // Rola até o Score SST
      setTimeout(() => {
        scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } finally {
      setCalculandoScore(false);
    }
  };

  const handleAbrirCheckout = () => {
    setModalCheckoutAberto(true);
    setPagamentoConcluido(false);
    if (!docPagador && empresaSelecionada?.cnpj) {
      setDocPagador(empresaSelecionada.cnpj);
    }
  };

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

  function formatarCpfCnpj(val: string) {
    const digitos = val.replace(/\D/g, '').slice(0, 14);
    if (digitos.length <= 11) {
      if (digitos.length <= 3) return digitos;
      if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
      if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
      return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
    }
    return digitos
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function validarDocumento(doc: string): boolean {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      if (/^(\d)\1+$/.test(clean)) return false;
      let soma = 0;
      for (let i = 0; i < 9; i++) soma += parseInt(clean.charAt(i)) * (10 - i);
      let resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(clean.charAt(9))) return false;
      soma = 0;
      for (let i = 0; i < 10; i++) soma += parseInt(clean.charAt(i)) * (11 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      return resto === parseInt(clean.charAt(10));
    }
    if (clean.length === 14) {
      if (/^(\d)\1+$/.test(clean)) return false;
      let tamanho = clean.length - 2;
      let numeros = clean.substring(0, tamanho);
      const digitos = clean.substring(tamanho);
      let soma = 0;
      let pos = tamanho - 7;
      for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
      if (resultado !== parseInt(digitos.charAt(0))) return false;
      tamanho = tamanho + 1;
      numeros = clean.substring(0, tamanho);
      soma = 0;
      pos = tamanho - 7;
      for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
      return resultado === parseInt(digitos.charAt(1));
    }
    return false;
  }

  // Processar pagamento via PIX ou Cartão de Crédito Transparente (R$ 19,90)
  const handleProcessarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCheckout('');

    const cleanPhone = whatsappLead.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErroCheckout('Por favor, informe um WhatsApp válido para receber o diagnóstico.');
      return;
    }

    const cleanDoc = (docPagador || empresaSelecionada?.cnpj || '').replace(/\D/g, '');
    if (!cleanDoc) {
      setErroCheckout('Por favor, informe o CPF ou CNPJ do pagador (obrigatório para emissão do PIX oficial).');
      return;
    }
    if (!validarDocumento(cleanDoc)) {
      setErroCheckout(
        cleanDoc.length <= 11
          ? 'O CPF informado é inválido. Digite um CPF válido para registrar o PIX oficial no Banco Central.'
          : 'O CNPJ informado é inválido. Digite um CNPJ válido para registrar o PIX oficial no Banco Central.'
      );
      return;
    }

    const bodyPayload: any = {
      plano: 'completo', // R$ 19,90 oficial
      empresa: empresaSelecionada?.razao_social,
      cnpj: cleanDoc.length === 14 ? cleanDoc : empresaSelecionada?.cnpj,
      documento: cleanDoc,
      cidade: empresaSelecionada?.cidade,
      uf: empresaSelecionada?.uf,
      cnae_descricao: empresaSelecionada?.cnae_descricao,
      score: scoreCalculado ?? 28,
      respostas_questionario: {
        temPgr,
        temPcmso,
        temLtcat,
        temAso,
        enviaEsocial,
        qtdColaboradores,
        teveAcidenteOuFiscalizacao,
      },
      whatsapp: whatsappLead,
      nome: nomeLead || 'Responsável',
      email: emailLead || undefined,
      metodo: metodoCheckout,
    };

    if (metodoCheckout === 'cartao') {
      const numLimpo = numeroCartao.replace(/\D/g, '');
      if (!numLimpo || numLimpo.length < 13) {
        setErroCheckout('Informe um número de cartão de crédito válido.');
        return;
      }
      if (!nomeCartao.trim()) {
        setErroCheckout('Informe o nome impresso no cartão.');
        return;
      }
      if (!validadeCartao.includes('/') || validadeCartao.replace(/\D/g, '').length < 4) {
        setErroCheckout('Informe a validade do cartão no formato MM/AA.');
        return;
      }
      if (!cvvCartao.trim() || cvvCartao.length < 3) {
        setErroCheckout('Informe o código de segurança (CVV).');
        return;
      }
      const cpfLimpo = (cpfCartao || cleanDoc).replace(/\D/g, '');
      if (!cpfLimpo || cpfLimpo.length < 11) {
        setErroCheckout('Informe o CPF do titular do cartão.');
        return;
      }

      bodyPayload.cartao = {
        numero: numeroCartao,
        nomeTitular: nomeCartao,
        validade: validadeCartao,
        cvv: cvvCartao,
        cpfTitular: cpfLimpo,
        cep: cepCartao,
      };
    }

    setGerandoCheckout(true);
    try {
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.erro || 'Falha ao processar pagamento com o Asaas.');
      }

      setPedidoId(data.pedido_id);
      if (data.token_ficha) {
        setTokenFicha(data.token_ficha);
      }
      setCheckoutUrl(data.checkout_url || '');

      // Se pagou no cartão e já aprovou na hora pelo Asaas
      if (data.pago) {
        setPagamentoConcluido(true);
        return;
      }

      // Se for PIX
      if (metodoCheckout === 'pix') {
        setPixCopiaCola(data.pix_copia_cola || '');
        setPixQrCode(data.pix_qr_code || '');
        iniciarPollingPagamento(data.pedido_id);
      }
    } catch (err: any) {
      console.error('Erro ao gerar pagamento:', err);
      setErroCheckout(err.message || 'Erro ao processar pagamento. Verifique os dados e tente novamente.');
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

        {/* FORMULÁRIO DE PERGUNTAS ESTRATÉGICAS & DADOS DE CONTATO (PREENCHIDOS ANTES DO SCORE) */}
        {empresaSelecionada && (mostrarFormulario || scoreCalculado === null) && (
          <div
            ref={formRef}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-fade-in"
          >
            {/* Cabeçalho do formulário */}
            <div className="border-b border-slate-100 pb-5 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <span>Passo Obrigatório</span>
                <span>•</span>
                <span>Questionário dos Programas SST & Contato</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Diagnóstico de Conformidade & Riscos SST
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Para calcular com precisão o <strong>Score SST</strong> de <span className="font-semibold text-slate-900">{empresaSelecionada.razao_social}</span>, informe seus dados de contato e a situação real dos programas obrigatórios perante o Ministério do Trabalho e eSocial.
              </p>
            </div>

            {erroFormulario && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <span className="text-red-600 text-base">⚠️</span>
                <span>{erroFormulario}</span>
              </div>
            )}

            <form onSubmit={handleCalcularScore} className="space-y-6">
              {/* BLOCO 1: DADOS DE CONTATO DO RESPONSÁVEL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Dados do Responsável pelo Diagnóstico
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nome Completo: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeLead}
                      onChange={(e) => setNomeLead(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>WhatsApp com DDD: <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-emerald-600 font-semibold">📱 Envio do Laudo</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsappLead}
                      onChange={(e) => setWhatsappLead(formatarTelefoneInput(e.target.value))}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50/50 focus:bg-white transition font-mono"
                    />
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      E-mail Corporativo: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={emailLead}
                      onChange={(e) => setEmailLead(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: PROGRAMAS DE SST OBRIGATÓRIOS */}
              <div className="space-y-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Programas & Exigências Ocupacionais (NRs e eSocial)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pergunta 1: PGR */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📄</span>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          PGR — Programa de Gerenciamento de Riscos (NR-01)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Identificação de riscos operacionais e plano de prevenção.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'vigente', label: 'Possui Vigente' },
                        { id: 'vencido', label: 'Possui Vencido' },
                        { id: 'nao_possui', label: 'Não Possui' },
                        { id: 'nao_sei', label: 'Não Tenho Certeza' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTemPgr(op.id as any)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-left cursor-pointer ${
                            temPgr === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {temPgr === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pergunta 2: PCMSO */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base">🩺</span>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          PCMSO — Controle Médico de Saúde Ocupacional (NR-07)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Planejamento de exames coordenado por médico do trabalho.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'vigente', label: 'Possui Vigente' },
                        { id: 'vencido', label: 'Possui Vencido' },
                        { id: 'nao_possui', label: 'Não Possui' },
                        { id: 'nao_sei', label: 'Não Tenho Certeza' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTemPcmso(op.id as any)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-left cursor-pointer ${
                            temPcmso === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {temPcmso === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pergunta 3: Exames Ocupacionais / ASO */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📋</span>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          Exames Médicos Ocupacionais (ASO)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Exames admissionais, periódicos e demissionais dos colaboradores.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'em_dia', label: 'Todos em Dia' },
                        { id: 'parcial', label: 'Exames em Atraso' },
                        { id: 'nao_realiza', label: 'Não Realiza' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTemAso(op.id as any)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-center cursor-pointer ${
                            temAso === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {temAso === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pergunta 4: Transmissão ao eSocial */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📡</span>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          Eventos de SST no eSocial (S-2210, S-2220, S-2240)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Comunicação de acidentes, monitoramento e agentes nocivos.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'transmite', label: 'Transmite em Dia' },
                        { id: 'pendente', label: 'Pendente / Dúvida' },
                        { id: 'nunca_enviou', label: 'Nunca Enviou' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setEnviaEsocial(op.id as any)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-center cursor-pointer ${
                            enviaEsocial === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {enviaEsocial === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pergunta 5: LTCAT */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚖️</span>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          LTCAT / Laudo de Insalubridade e Periculosidade
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Laudo para previdência social, PPP e adicionais trabalhistas.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'vigente', label: 'Possui Emitido' },
                        { id: 'vencido', label: 'Desatualizado' },
                        { id: 'nao_possui', label: 'Não Possui' },
                        { id: 'nao_sei', label: 'Não Sei Informar' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTemLtcat(op.id as any)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-left cursor-pointer ${
                            temLtcat === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          {temLtcat === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pergunta 6 & 7: Equipe e Histórico */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                        <span>👥 Nº Estimado de Colaboradores CLT / Ativos:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: '1_5', label: '1 a 5' },
                          { id: '6_20', label: '6 a 20' },
                          { id: '21_50', label: '21 a 50' },
                          { id: '50_plus', label: '50+' },
                        ].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setQtdColaboradores(op.id as any)}
                            className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition text-center cursor-pointer ${
                              qtdColaboradores === op.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                        <span>⚠️ Notificação, Fiscalização ou Acidente nos últimos 12 meses?</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'nao', label: 'Não, sem ocorrências' },
                          { id: 'sim', label: 'Sim, houve notificação' },
                        ].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setTeveAcidenteOuFiscalizacao(op.id as any)}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition text-center cursor-pointer ${
                              teveAcidenteOuFiscalizacao === op.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {teveAcidenteOuFiscalizacao === op.id ? '✓ ' : ''}{op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÃO PRINCIPAL DE CÁLCULO */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={calculandoScore}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base sm:text-lg transition shadow-lg hover:shadow-xl flex items-center justify-center gap-3 cursor-pointer group"
                >
                  {calculandoScore ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Apurando Conformidade e Calculando Score SST...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Calcular Score SST da Minha Empresa</span>
                      <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  🔒 Seus dados estão seguros e protegidos pela LGPD. O cálculo é imediato e confidencial.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ÁREA DO VELOCÍMETRO / MEDIDOR DE SCORE SST (SÓ APARECE APÓS PREENCHER O QUESTIONÁRIO E CONTATO) */}
        {scoreCalculado !== null && empresaSelecionada && (
          <div ref={scoreRef} className="space-y-6 animate-fade-in pt-2">
            <SstScoreGauge
              score={scoreCalculado}
              empresaNome={empresaSelecionada.razao_social}
              cnpj={empresaSelecionada.cnpj}
              onContratarDiagnostico={handleAbrirCheckout}
              pontosCriticos={pontosCriticos}
              onEditarRespostas={() => {
                setMostrarFormulario(true);
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
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

      {/* MODAL DE CHECKOUT TRANSPARENTE ASAAS - R$ 19,90 (PIX E CARTÃO) */}
      {modalCheckoutAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Diagnóstico Completo SST</h3>
                  <p className="text-xs text-slate-400">Checkout Transparente Oficial Asaas • R$ 19,90</p>
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
                      Pagamento Aprovado com Sucesso!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Seu Diagnóstico Completo de SST foi liberado. Responda às <strong>perguntas estratégicas</strong> da ficha técnica para emissão do laudo definitivo em PDF.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={tokenFicha ? `/ficha/${tokenFicha}` : '/ficha'}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition shadow-md"
                    >
                      <span>Acessar Ficha & Concluir Meu Diagnóstico</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : !pixCopiaCola ? (
                // FORMULÁRIO DE CHECKOUT (PIX OU CARTÃO)
                <form onSubmit={handleProcessarPagamento} className="space-y-4">
                  {/* Seletor de Método de Pagamento */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMetodoCheckout('pix');
                        setErroCheckout('');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        metodoCheckout === 'pix'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>⚡ PIX Imediato</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMetodoCheckout('cartao');
                        setErroCheckout('');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        metodoCheckout === 'cartao'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>💳 Cartão de Crédito</span>
                    </button>
                  </div>

                  {/* Resumo da Empresa Selecionada */}
                  <div className="bg-blue-50/80 rounded-2xl p-3 border border-blue-200/80 text-xs text-blue-900 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-blue-950">
                        {empresaSelecionada?.razao_social || 'Sua Empresa'}
                      </div>
                      <div className="font-mono text-[11px] text-blue-800">
                        CNPJ: {empresaSelecionada?.cnpj}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Valor Único</span>
                      <span className="text-base font-extrabold text-emerald-700">R$ 19,90</span>
                    </div>
                  </div>

                  {/* Alerta de Erro se houver */}
                  {erroCheckout && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                      <span className="text-red-600 font-bold shrink-0">⚠️</span>
                      <p>{erroCheckout}</p>
                    </div>
                  )}

                  {/* DADOS DO RESPONSÁVEL */}
                  <div className="space-y-3 pt-1">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          WhatsApp:
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
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>CPF ou CNPJ do Pagador:</span>
                        <span className="text-[10px] text-emerald-600 font-bold">✓ Exigência Banco Central</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={18}
                        value={docPagador}
                        onChange={(e) => setDocPagador(formatarCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-slate-50/50"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        O Banco Central exige CPF ou CNPJ válido do pagador para registrar a cobrança PIX oficial (Asaas Produção).
                      </p>
                    </div>
                  </div>

                  {/* SE FOR CARTÃO DE CRÉDITO: CAMPOS DO CARTÃO TRANSPARENTE */}
                  {metodoCheckout === 'cartao' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Dados do Cartão de Crédito</span>
                        <span className="text-[10px] text-slate-500">🔒 Ambiente Seguro Asaas</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Número do Cartão:
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={numeroCartao}
                          onChange={(e) => setNumeroCartao(formatarNumeroCartao(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm font-mono tracking-wide focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nome Impresso no Cartão:
                        </label>
                        <input
                          type="text"
                          required
                          value={nomeCartao}
                          onChange={(e) => setNomeCartao(e.target.value.toUpperCase())}
                          placeholder="NOME COMO NO CARTAO"
                          className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Validade:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={validadeCartao}
                            onChange={(e) => setValidadeCartao(formatarValidade(e.target.value))}
                            placeholder="MM/AA"
                            className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm text-center font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            CVV:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={4}
                            value={cvvCartao}
                            onChange={(e) => setCvvCartao(e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm text-center font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            CPF do Titular:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={14}
                            value={cpfCartao}
                            onChange={(e) => setCpfCartao(formatarCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            CEP (opcional):
                          </label>
                          <input
                            type="text"
                            maxLength={9}
                            value={cepCartao}
                            onChange={(e) => setCepCartao(e.target.value)}
                            placeholder="00000-000"
                            className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOTÃO DE CONFIRMAÇÃO DO CHECKOUT */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={gerandoCheckout}
                      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        metodoCheckout === 'cartao'
                          ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      }`}
                    >
                      {gerandoCheckout ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{metodoCheckout === 'cartao' ? 'Processando Cartão com Asaas...' : 'Gerando Cobrança PIX...'}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {metodoCheckout === 'cartao'
                              ? 'Pagar R$ 19,90 no Cartão (Aprovação Imediata)'
                              : 'Pagar R$ 19,90 via PIX Imediato'}
                          </span>
                          <span>→</span>
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

                    <button
                      type="button"
                      onClick={() => {
                        setPixCopiaCola('');
                        setPixQrCode('');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
                    >
                      ← Trocar forma de pagamento
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
