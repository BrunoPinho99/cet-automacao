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
  // Modo de busca: 'nome' ou 'cnpj'
  const [modoBusca, setModoBusca] = useState<'nome' | 'cnpj'>('nome');
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [sugestoes, setSugestoes] = useState<EmpresaItem[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaItem | null>(null);
  const [scoreCalculado, setScoreCalculado] = useState<number | null>(null);

  // Estados dos Dados de Contato Obrigatórios
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

  // FAQ Accordion State
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

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
  const searchSectionRef = useRef<HTMLDivElement>(null);

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

  const handleSelecionarEmpresa = (empresa: EmpresaItem) => {
    setEmpresaSelecionada(empresa);
    setBusca(empresa.razao_social);
    setMostrarDropdown(false);

    setScoreCalculado(null);
    setMostrarFormulario(true);
    setErroFormulario(null);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 140);
  };

  const handleLimparBusca = () => {
    setBusca('');
    setEmpresaSelecionada(null);
    setScoreCalculado(null);
    setSugestoes([]);
    setErroFormulario(null);
    setMostrarFormulario(true);
  };

  const rolarParaBusca = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCalcularScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroFormulario(null);

    if (!nomeLead.trim()) {
      setErroFormulario('Por favor, informe seu Nome Completo para identificação técnica.');
      return;
    }

    const cleanPhone = whatsappLead.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErroFormulario('Por favor, informe um WhatsApp válido com DDD (mínimo 10 dígitos) para receber o parecer técnico.');
      return;
    }

    const emailLimpo = emailLead.trim();
    if (!emailLimpo || !emailLimpo.includes('@') || !emailLimpo.includes('.')) {
      setErroFormulario('Por favor, informe um e-mail válido para envio oficial do diagnóstico de SST.');
      return;
    }

    setCalculandoScore(true);

    try {
      // Registra o lead na base de dados em segundo plano
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

      // Simulação de processamento técnico pericial
      await new Promise((resolve) => setTimeout(resolve, 600));

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
        pontos.push('Ausência de LTCAT / Laudo Previdenciário');
      } else if (temLtcat === 'vencido') {
        nota -= 6;
        pontos.push('LTCAT Desatualizado');
      }

      // 6. Histórico de Notificação / Acidente
      if (teveAcidenteOuFiscalizacao === 'sim') {
        nota -= 10;
        pontos.push('Histórico de Fiscalização / Notificação Recente');
      }

      // 7. Agravante por Grau de Risco do CNAE (NR-04)
      const risco = empresaSelecionada?.grau_risco || 2;
      if (risco >= 3 && (temPgr !== 'vigente' || temPcmso !== 'vigente')) {
        nota -= 6;
        pontos.push(`Grau de Risco Elevado (NR-04 Grau ${risco})`);
      }

      const scoreFinal = Math.max(18, Math.min(98, Math.round(nota)));
      setPontosCriticos(pontos);
      setScoreCalculado(scoreFinal);

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

  const handleProcessarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCheckout('');

    const cleanPhone = whatsappLead.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErroCheckout('Por favor, informe um WhatsApp válido para envio do diagnóstico.');
      return;
    }

    const cleanDoc = (docPagador || empresaSelecionada?.cnpj || '').replace(/\D/g, '');
    if (!cleanDoc) {
      setErroCheckout('Por favor, informe o CPF ou CNPJ do pagador (obrigatório pelo Banco Central para cobrança oficial).');
      return;
    }
    if (!validarDocumento(cleanDoc)) {
      setErroCheckout(
        cleanDoc.length <= 11
          ? 'O CPF informado é inválido. Digite um CPF válido.'
          : 'O CNPJ informado é inválido. Digite um CNPJ válido.'
      );
      return;
    }

    const bodyPayload: any = {
      plano: 'completo',
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

      if (data.pago) {
        setPagamentoConcluido(true);
        return;
      }

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* BARRA SUPERIOR DE DESTAQUE INSTITUCIONAL */}
      <div className="bg-slate-900 text-white text-xs sm:text-sm py-2 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-3 font-medium text-slate-300">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Atendimento Nacional
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline">Clínica Credenciada em Medicina Ocupacional & Engenharia de Segurança</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista%20da%20CET%20sobre%20Seguran%C3%A7a%20e%20Medicina%20do%20Trabalho."
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5"
            >
              <span>📱 Plantão Técnico WhatsApp</span>
            </a>
            <span className="text-slate-700">|</span>
            <Link href="/ficha" className="text-slate-300 hover:text-white transition">
              Área da Empresa →
            </Link>
          </div>
        </div>
      </div>

      {/* CABEÇALHO PRINCIPAL EXPANDIDO */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 sm:h-22 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-cet.png"
              alt="CET Clínica"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <span className="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                CET <span className="text-blue-600 font-bold text-lg sm:text-xl">CLÍNICA</span>
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-slate-600">
                Segurança & Medicina do Trabalho
              </span>
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-600">
            <a href="#diagnostico" className="hover:text-blue-600 transition">
              Diagnóstico NR
            </a>
            <a href="#programas-obrigatorios" className="hover:text-blue-600 transition">
              Programas (PGR/PCMSO)
            </a>
            <a href="#tabela-multas" className="hover:text-blue-600 transition">
              Tabela de Multas
            </a>
            <a href="#como-funciona" className="hover:text-blue-600 transition">
              Como Funciona
            </a>
            <a href="#faq" className="hover:text-blue-600 transition">
              Dúvidas Frequentes
            </a>
          </nav>

          {/* Botão de Ação Direta */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={rolarParaBusca}
              className="hidden sm:inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl text-sm transition shadow-sm hover:shadow cursor-pointer"
            >
              <span>Consultar CNPJ Grátis</span>
              <span className="text-blue-200">→</span>
            </button>
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20enquadramento%20de%20SST%20para%20minha%20empresa."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-3 sm:px-4 sm:py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold transition"
            >
              <span className="hidden sm:inline">Falar com Especialista</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION DE ALTO IMPACTO (EXPANSIVA E AUTORITÁRIA) */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-b border-slate-200 py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Medicina Ocupacional & Engenharia de Segurança Credenciada • Desde 2012</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Diagnóstico de Conformidade em{' '}
            <span className="text-blue-600 underline decoration-blue-200 decoration-wavy underline-offset-8">
              Segurança e Medicina do Trabalho
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Verifique o enquadramento do <strong className="text-slate-800 font-semibold">Grau de Risco (NR-04)</strong> da sua empresa, a vigência dos programas obrigatórios (<strong className="text-slate-800 font-semibold">PGR e PCMSO</strong>), exames ocupacionais (<strong className="text-slate-800 font-semibold">ASO</strong>) e o envio dos eventos de SST ao <strong className="text-slate-800 font-semibold">eSocial</strong> perante as exigências do Ministério do Trabalho.
          </p>

          {/* 4 CARDS DE AUTORIDADE INSTITUCIONAL */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 pt-6 text-left">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-blue-600">+1.200</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">Empresas Atendidas</div>
              <div className="text-[11px] sm:text-xs text-slate-500">Comércio, Indústria e Serviços em todo o Brasil.</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">ART & CRM</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">Responsabilidade Técnica</div>
              <div className="text-[11px] sm:text-xs text-slate-500">Médicos do Trabalho e Engenheiros de Segurança.</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-blue-600">100% eSocial</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">Transmissão Direta</div>
              <div className="text-[11px] sm:text-xs text-slate-500">Eventos S-2210, S-2220 e S-2240 integrados.</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-amber-600">Zero Multas</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">Blindagem Jurídica</div>
              <div className="text-[11px] sm:text-xs text-slate-500">Proteção trabalhista conforme a Portaria MTP 672.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ÁREA DE DIAGNÓSTICO INTERATIVO EXPANDIDA */}
      <main id="diagnostico" className="flex-1 py-10 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-10">
        {/* CAIXA DE BUSCA DE EMPRESA */}
        <div
          ref={(el) => {
            searchSectionRef.current = el;
            dropdownRef.current = el;
          }}
          className="bg-white rounded-3xl p-6 sm:p-10 shadow-md border border-slate-200 space-y-6 relative"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Etapa 1 de 2 • Consulta Cadastral Oficial
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Consulte os Dados da sua Empresa
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Localize sua empresa pelo nome ou CNPJ para identificar o CNAE e enquadramento de Grau de Risco (NR-04).
              </p>
            </div>

            <span className="text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-2 w-fit shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Base Oficial da Receita Federal
            </span>
          </div>

          {/* SELETOR DE MODO: NOME OU CNPJ */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => {
                setModoBusca('nome');
                setBusca('');
                setSugestoes([]);
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                modoBusca === 'nome'
                  ? 'bg-white text-blue-700 shadow-sm'
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
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                modoBusca === 'cnpj'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 Digitar / Colar CNPJ
            </button>
          </div>

          {/* CAMPO DE ENTRADA EXPANDIDO */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                {buscando ? (
                  <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    ? 'Digite a Razão Social ou Nome Fantasia da empresa...'
                    : 'Cole ou digite os 14 números do CNPJ...'
                }
                className="w-full pl-13 pr-12 py-4 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-2xl text-base sm:text-lg text-slate-900 transition-all outline-hidden font-medium placeholder:text-slate-400"
              />

              {busca && (
                <button
                  type="button"
                  onClick={handleLimparBusca}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpar campo"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-extrabold rounded-2xl text-base transition shadow-sm hover:shadow shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {buscando ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <span>{modoBusca === 'nome' ? 'Localizar Empresa' : 'Consultar CNPJ'}</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* STATUS DE CONSULTA NA RECEITA FEDERAL */}
          {buscandoReceita && (
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-sm font-semibold flex items-center gap-3 animate-fade-in">
              <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Consultando dados cadastrais, CNAE e enquadramento de Grau de Risco na Receita Federal do Brasil...</span>
            </div>
          )}

          {/* DROPDOWN DE SUGESTÕES */}
          {mostrarDropdown && (
            <div className="absolute left-6 right-6 top-[220px] z-30 bg-white rounded-2xl border-2 border-slate-300 shadow-2xl overflow-hidden max-h-96 overflow-y-auto animate-fade-in divide-y divide-slate-100">
              {sugestoes.length > 0 ? (
                <>
                  <div className="px-5 py-3 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>{sugestoes.length} {sugestoes.length === 1 ? 'Empresa encontrada' : 'Empresas encontradas'}</span>
                    <span className="text-slate-400 font-normal">Clique para vincular e iniciar diagnóstico</span>
                  </div>

                  {sugestoes.map((emp, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelecionarEmpresa(emp)}
                      className="w-full px-5 py-4 text-left hover:bg-blue-50/80 transition-colors flex items-start justify-between gap-4 group cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-base text-slate-900 group-hover:text-blue-700 truncate">
                            {emp.razao_social}
                          </div>
                          {emp.origem === 'receita_federal' && (
                            <span className="shrink-0 px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md">
                              Receita Federal
                            </span>
                          )}
                        </div>

                        {emp.nome_fantasia && emp.nome_fantasia !== emp.razao_social && (
                          <div className="text-sm text-slate-600 font-medium">
                            Nome Fantasia: {emp.nome_fantasia}
                          </div>
                        )}
                        {emp.cnae_descricao && (
                          <div className="text-xs text-slate-500 truncate">
                            Atividade: {emp.cnae_descricao}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-xs font-mono font-bold text-slate-800 group-hover:text-blue-900">
                          {emp.cnpj}
                        </span>
                        <div className="text-xs text-slate-500 mt-1">
                          {emp.cidade} - {emp.uf}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : !buscando && busca.trim().length >= 3 ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl">
                    🔍
                  </div>
                  {modoBusca === 'nome' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-700 font-medium">
                        Não encontramos resultados rápidos pelo nome <strong>&quot;{busca}&quot;</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModoBusca('cnpj');
                          setBusca('');
                          setSugestoes([]);
                          setMostrarDropdown(false);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer"
                      >
                        <span>🏢 Digitar ou Colar CNPJ Diretamente (100% Preciso)</span>
                        <span>→</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-700 font-medium">
                        CNPJ: <strong className="font-mono text-base">{busca}</strong>
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer"
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

          {/* CARD DA EMPRESA SELECIONADA */}
          {empresaSelecionada && (
            <div className="p-6 bg-blue-50/90 rounded-3xl border-2 border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-blue-200">
                    ✓ Empresa Selecionada
                  </span>
                  {empresaSelecionada.origem === 'receita_federal' && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      🟢 Base Oficial da Receita Federal
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  {empresaSelecionada.razao_social}
                </h3>

                {empresaSelecionada.nome_fantasia && empresaSelecionada.nome_fantasia !== empresaSelecionada.razao_social && (
                  <p className="text-sm text-slate-700 font-semibold">
                    Nome Fantasia: {empresaSelecionada.nome_fantasia}
                  </p>
                )}

                <div className="text-sm text-slate-600 flex flex-wrap gap-x-6 gap-y-1.5 pt-1">
                  <span>CNPJ: <strong className="font-mono text-slate-900 font-bold">{empresaSelecionada.cnpj}</strong></span>
                  <span>Cidade: <strong className="text-slate-900">{empresaSelecionada.cidade} - {empresaSelecionada.uf}</strong></span>
                  {empresaSelecionada.cnae_descricao && (
                    <span className="w-full text-xs sm:text-sm text-slate-700">
                      CNAE / Atividade: <strong className="text-slate-900">{empresaSelecionada.cnae_descricao}</strong>
                    </span>
                  )}
                  {empresaSelecionada.grau_risco && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                      ⚠️ NR-04: Grau de Risco {empresaSelecionada.grau_risco}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLimparBusca}
                className="text-sm text-blue-700 hover:text-blue-900 font-bold underline underline-offset-4 shrink-0 py-2 px-3 bg-white hover:bg-slate-50 rounded-xl border border-blue-200 cursor-pointer"
              >
                Trocar Empresa
              </button>
            </div>
          )}
        </div>

        {/* FORMULÁRIO DE AVALIAÇÃO DOS PROGRAMAS SST & CONTATO */}
        {empresaSelecionada && (mostrarFormulario || scoreCalculado === null) && (
          <div
            ref={formRef}
            className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 animate-fade-in"
          >
            <div className="border-b border-slate-200 pb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <span>Etapa 2 de 2</span>
                <span>•</span>
                <span>Questionário dos Programas de SST & Responsável</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Diagnóstico de Conformidade das Normas Regulamentadoras
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                Para calcular com precisão o <strong className="text-slate-900">Score SST</strong> de <span className="font-bold text-slate-900">{empresaSelecionada.razao_social}</span>, informe seus dados de contato e a situação real dos programas exigidos pelo Ministério do Trabalho e eSocial.
              </p>
            </div>

            {erroFormulario && (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-900 text-sm font-bold flex items-center gap-3 animate-fade-in">
                <span className="text-red-600 text-xl shrink-0">⚠️</span>
                <span>{erroFormulario}</span>
              </div>
            )}

            <form onSubmit={handleCalcularScore} className="space-y-8">
              {/* BLOCO 1: DADOS DO RESPONSÁVEL */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-black flex items-center justify-center">1</span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                    Dados do Responsável pelo Diagnóstico
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      Nome Completo: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeLead}
                      onChange={(e) => setNomeLead(e.target.value)}
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className="w-full h-14 px-4 rounded-xl border border-slate-300 text-base focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>WhatsApp com DDD: <span className="text-red-500">*</span></span>
                      <span className="text-xs text-emerald-700 font-semibold">📱 Envio Oficial</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsappLead}
                      onChange={(e) => setWhatsappLead(formatarTelefoneInput(e.target.value))}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      className="w-full h-14 px-4 rounded-xl border border-slate-300 text-base font-mono focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      E-mail Corporativo: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={emailLead}
                      onChange={(e) => setEmailLead(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full h-14 px-4 rounded-xl border border-slate-300 text-base focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: PROGRAMAS OBRIGATÓRIOS DE SST */}
              <div className="space-y-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-black flex items-center justify-center">2</span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                    Programas Ocupacionais Obrigatórios (Portaria MTP 672 / CLT)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* PGR */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <span className="block text-sm sm:text-base font-black text-slate-900">
                          PGR — Programa de Gerenciamento de Riscos (NR-01)
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          Mapeamento de riscos físicos, químicos, biológicos e ergonômicos com Plano de Ação.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
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
                          className={`p-3 text-xs sm:text-sm font-bold rounded-xl border transition text-left cursor-pointer ${
                            temPgr === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          {temPgr === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PCMSO */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🩺</span>
                      <div>
                        <span className="block text-sm sm:text-base font-black text-slate-900">
                          PCMSO — Controle Médico de Saúde Ocupacional (NR-07)
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          Planejamento dos exames clínicos e complementares coordenado por Médico do Trabalho.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
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
                          className={`p-3 text-xs sm:text-sm font-bold rounded-xl border transition text-left cursor-pointer ${
                            temPcmso === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          {temPcmso === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ASO */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📋</span>
                      <div>
                        <span className="block text-sm sm:text-base font-black text-slate-900">
                          Exames Médicos Ocupacionais (ASO)
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          Atestados Admissionais, Periódicos e Demissionais dos colaboradores CLT.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                      {[
                        { id: 'em_dia', label: 'Todos em Dia' },
                        { id: 'parcial', label: 'Exames em Atraso' },
                        { id: 'nao_realiza', label: 'Não Realiza' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTemAso(op.id as any)}
                          className={`p-3 text-xs sm:text-sm font-bold rounded-xl border transition text-center cursor-pointer ${
                            temAso === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          {temAso === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* eSocial SST */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📡</span>
                      <div>
                        <span className="block text-sm sm:text-base font-black text-slate-900">
                          Eventos de SST no eSocial (S-2210, S-2220, S-2240)
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          Comunicação obrigatória de acidentes, exames médicos e agentes nocivos para o PPP Digital.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                      {[
                        { id: 'transmite', label: 'Transmite em Dia' },
                        { id: 'pendente', label: 'Pendente / Dúvida' },
                        { id: 'nunca_enviou', label: 'Nunca Enviou' },
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setEnviaEsocial(op.id as any)}
                          className={`p-3 text-xs sm:text-sm font-bold rounded-xl border transition text-center cursor-pointer ${
                            enviaEsocial === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          {enviaEsocial === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LTCAT */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚖️</span>
                      <div>
                        <span className="block text-sm sm:text-base font-black text-slate-900">
                          LTCAT / Laudo de Insalubridade e Periculosidade
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          Laudo previdenciário para fins de aposentadoria especial e adicionais da CLT.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
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
                          className={`p-3 text-xs sm:text-sm font-bold rounded-xl border transition text-left cursor-pointer ${
                            temLtcat === op.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          {temLtcat === op.id ? '✓ ' : ''}{op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantidade de Colaboradores e Histórico */}
                  <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900 mb-2">
                        👥 Quantidade de Colaboradores CLT:
                      </div>
                      <div className="grid grid-cols-4 gap-2">
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
                            className={`p-2.5 text-xs sm:text-sm font-bold rounded-xl border transition text-center cursor-pointer ${
                              qtdColaboradores === op.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <div className="text-sm font-bold text-slate-900 mb-2">
                        ⚠️ Notificação, fiscalização ou acidente nos últimos 12 meses?
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: 'nao', label: 'Não, sem ocorrências' },
                          { id: 'sim', label: 'Sim, houve notificação' },
                        ].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setTeveAcidenteOuFiscalizacao(op.id as any)}
                            className={`p-2.5 text-xs sm:text-sm font-bold rounded-xl border transition text-center cursor-pointer ${
                              teveAcidenteOuFiscalizacao === op.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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

              {/* BOTÃO PRINCIPAL DE CÁLCULO EXPANDIDO */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={calculandoScore}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold py-5 px-8 rounded-2xl text-lg sm:text-xl transition shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 cursor-pointer group"
                >
                  {calculandoScore ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Apurando Conformidade e Calculando Score SST...</span>
                    </>
                  ) : (
                    <>
                      <span>Calcular Score SST da Minha Empresa</span>
                      <span className="text-emerald-200 group-hover:translate-x-1.5 transition-transform">→</span>
                    </>
                  )}
                </button>
                <p className="text-xs sm:text-sm text-center text-slate-500 mt-3 font-medium">
                  🔒 Seus dados estão seguros e protegidos pela LGPD. O cálculo é imediato, pericial e confidencial.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ÁREA DO VELOCÍMETRO / MEDIDOR DE SCORE SST */}
        {scoreCalculado !== null && empresaSelecionada && (
          <div ref={scoreRef} className="space-y-8 animate-fade-in pt-4">
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

        {/* EXEMPLOS CASO NENHUMA EMPRESA TENHA SIDO PESQUISADA */}
        {!empresaSelecionada && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                Exemplos de empresas para simulação imediata:
              </h3>
              <span className="text-xs text-slate-500 hidden sm:inline">Clique para testar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { nome: 'Metalúrgica Aliança & Soldas Ltda', cnpj: '12.345.678/0001-90', cidade: 'São Paulo - SP', ramo: 'Metalurgia / Indústria' },
                { nome: 'Construtora Horizonte Forte Ltda', cnpj: '23.456.789/0001-01', cidade: 'Curitiba - PR', ramo: 'Construção Civil' },
                { nome: 'Transportadora Rápido Brasil Ltda', cnpj: '34.567.890/0001-12', cidade: 'Campinas - SP', ramo: 'Logística e Transportes' },
                { nome: 'Padaria & Restaurante Delícias do Trigo', cnpj: '56.789.012/0001-34', cidade: 'Santos - SP', ramo: 'Comércio / Alimentação' },
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
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      {item.nome}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {item.cnpj} • {item.cidade}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Consultar →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* SEÇÃO RICA 1: OS 4 PROGRAMAS OBRIGATÓRIOS DA LEGISLAÇÃO BRASILEIRA */}
      <section id="programas-obrigatorios" className="bg-white border-t border-slate-200 py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
              Conformidade Legal Obrigatória
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Os 4 Pilares de SST Exigidos por Lei
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Toda empresa brasileira com funcionários regidos pela CLT deve manter estes programas e laudos vigentes para evitar multas automáticas do eSocial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* 1. PGR */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-4 hover:border-blue-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl">
                01
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                PGR — Programa de Gerenciamento de Riscos (NR-01)
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Substituiu o antigo PPRA. O PGR é o documento mestre que contém o Inventário de Riscos (físicos, químicos, biológicos, ergonômicos e mecânicos) e o Plano de Ação para prevenção contínua no ambiente de trabalho.
              </p>
              <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                ✓ Assinado por Engenheiro de Segurança do Trabalho com ART.
              </div>
            </div>

            {/* 2. PCMSO */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-4 hover:border-blue-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">
                02
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                PCMSO — Controle Médico de Saúde Ocupacional (NR-07)
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Elaborado em consonância com os riscos mapeados no PGR. O PCMSO estabelece o cronograma de exames clínicos, complementares e o monitoramento da saúde física e mental dos colaboradores.
              </p>
              <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                ✓ Coordenado obrigatoriamente por Médico do Trabalho (com RQE).
              </div>
            </div>

            {/* 3. ASO */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-4 hover:border-blue-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xl">
                03
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                ASO — Atestado de Saúde Ocupacional
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Atesta a aptidão médica do trabalhador para a sua função específica. É obrigatório em 5 momentos: Admissional, Periódico, Retorno ao Trabalho, Mudança de Riscos Ocupacionais e Demissional.
              </p>
              <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                ✓ Emitido por Médico Examinador credenciado pela CET.
              </div>
            </div>

            {/* 4. eSocial SST */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-4 hover:border-blue-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xl">
                04
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Eventos de SST no eSocial (S-2210, S-2220, S-2240)
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Transmissão eletrônica mensal direta para a base do Governo Federal: Comunicação de Acidente de Trabalho (S-2210), Monitoramento da Saúde do Trabalhador (S-2220) e Condições Ambientais do Trabalho (S-2240) para o PPP Eletrônico.
              </p>
              <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                ✓ Transmissão automatizada e protocolo oficial da Receita Federal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO RICA 2: TABELA DE MULTAS OFICIAL (CLT / MTP) */}
      <section id="tabela-multas" className="bg-slate-900 text-white py-16 sm:py-24 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs sm:text-sm font-bold text-red-400 uppercase tracking-widest bg-red-950/80 border border-red-800 px-4 py-1.5 rounded-full">
              Riscos Financeiros e Previdenciários
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Tabela Oficial de Multas & Penalidades (CLT / eSocial)
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              O cruzamento de dados do eSocial com a Receita Federal é automatizado. O não envio dos eventos ou laudos desatualizados geram autos de infração sem necessidade de visita presencial.
            </p>
          </div>

          <div className="overflow-x-auto bg-slate-950/60 rounded-3xl border border-slate-800 p-2 sm:p-4 shadow-2xl">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs sm:text-sm uppercase tracking-wider">
                  <th className="py-4 px-4 sm:px-6">Infração Regulatória</th>
                  <th className="py-4 px-4 sm:px-6">Base Legal</th>
                  <th className="py-4 px-4 sm:px-6">Valor Estimado da Penalidade</th>
                  <th className="py-4 px-4 sm:px-6">Impacto Jurídico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-medium">
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 sm:px-6 font-bold text-white">Falta de PGR (NR-01)</td>
                  <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-400">Portaria MTP 672</td>
                  <td className="py-4 px-4 sm:px-6 text-red-400 font-bold">R$ 1.201,36 a R$ 5.244,95</td>
                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-300">Autuação imediata pelo Ministério do Trabalho</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 sm:px-6 font-bold text-white">Ausência de PCMSO (NR-07)</td>
                  <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-400">CLT Art. 168</td>
                  <td className="py-4 px-4 sm:px-6 text-red-400 font-bold">R$ 1.431,53 a R$ 4.298,07</td>
                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-300">Multa multiplicada por empregado desprotegido</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 sm:px-6 font-bold text-white">Deixar de emitir ASO (Exames)</td>
                  <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-400">CLT Art. 201</td>
                  <td className="py-4 px-4 sm:px-6 text-red-400 font-bold">R$ 402,53 a R$ 4.025,33</td>
                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-300">Por exame não realizado ou fora do prazo</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 sm:px-6 font-bold text-white">Não envio ao eSocial (S-2220 / S-2240)</td>
                  <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-400">Lei 8.213/91 Art. 92</td>
                  <td className="py-4 px-4 sm:px-6 text-red-400 font-bold">R$ 1.812,87 a R$ 40.253,00</td>
                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-300">Bloqueio de certidão e notificação da Receita Federal</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 sm:px-6 font-bold text-white">Omissão na emissão da CAT (S-2210)</td>
                  <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-400">Lei 8.213/91 Art. 22</td>
                  <td className="py-4 px-4 sm:px-6 text-red-400 font-bold">R$ 1.412,00 ao Teto do INSS</td>
                  <td className="py-4 px-4 sm:px-6 text-xs text-slate-300">Multa dobra em caso de reincidência</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold text-red-300">Não espere a notificação da Receita Federal</h4>
              <p className="text-xs sm:text-sm text-slate-400">Regularize os documentos e transmissões da sua empresa com a equipe pericial da CET.</p>
            </div>
            <button
              type="button"
              onClick={rolarParaBusca}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-sm transition shrink-0 cursor-pointer"
            >
              Consultar Minha Regularidade Agora →
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO RICA 3: COMO FUNCIONA A ASSESSORIA DA CET */}
      <section id="como-funciona" className="bg-slate-50 py-16 sm:py-24 px-4 sm:px-8 border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-widest bg-blue-100 px-4 py-1.5 rounded-full">
              Assessoria Especializada & Sem Burocracia
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Como a CET Regulariza a sua Empresa em 3 Passos
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Cuidamos de 100% da parte burocrática, médica e regulatória para que você foque exclusivamente no crescimento do seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black mx-auto border border-blue-200">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900">Diagnóstico Cadastral</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Consultamos o enquadramento do seu CNPJ, CNAE e Grau de Risco na Receita Federal para apontar exatamente quais NRs se aplicam à sua empresa.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black mx-auto border border-blue-200">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900">Elaboração Médica & ART</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nossos Médicos do Trabalho e Engenheiros de Segurança emitem os laudos oficiais (PGR, PCMSO, LTCAT) e os ASOs conforme o cronograma.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black mx-auto border border-blue-200">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900">Transmissão eSocial</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Enviamos os eventos S-2210, S-2220 e S-2240 mensalmente para a plataforma oficial do Governo Federal com recibo protocolado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO RICA 4: PERGUNTAS FREQUENTES (FAQ ACCORDION) */}
      <section id="faq" className="bg-white py-16 sm:py-24 px-4 sm:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Perguntas Frequentes de Empresários e Contadores
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Esclarecimentos técnicos da nossa equipe pericial sobre Segurança e Medicina do Trabalho.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                pergunta: 'Minha empresa tem apenas 1 ou 2 funcionários. Sou obrigado a ter PGR e PCMSO?',
                resposta:
                  'Sim. De acordo com a CLT e as Normas Regulamentadoras NR-01 e NR-07, qualquer empresa que possua ao menos um trabalhador com registro CLT é obrigada a elaborar o PGR e o PCMSO, além de realizar os exames admissionais, periódicos e demissionais (ASO). Algumas ME/EPP Grau de Risco 1 e 2 sem riscos físicos/químicos podem ter dispensa simplificada com declaração eletrônica, o que nosso diagnóstico apura.',
              },
              {
                pergunta: 'O que acontece se a empresa não transmitir os eventos de SST para o eSocial?',
                resposta:
                  'A ausência de transmissão dos eventos S-2210, S-2220 e S-2240 gera autuações automáticas pela Receita Federal e pelo Ministério do Trabalho, com multas que variam de R$ 1.812,87 a mais de R$ 40.000,00 por trabalhador, além de impedir a emissão do PPP Eletrônico e certidões negativas de débito.',
              },
              {
                pergunta: 'Qual a diferença entre o PGR e o antigo PPRA?',
                resposta:
                  'O PGR (NR-01) substituiu o PPRA em 2022 com um escopo muito mais abrangente. Enquanto o PPRA focava apenas em riscos ambientais (físicos, químicos e biológicos), o PGR obriga o mapeamento também de riscos ergonômicos e mecânicos/acidentes, além de exigir um plano de ação dinâmico e contínuo.',
              },
              {
                pergunta: 'Como funciona o agendamento dos exames clínicos (ASO)?',
                resposta:
                  'A CET conta com rede credenciada própria e clínicas parceiras em todo o Brasil. Os exames clínicos e complementares (audiometria, acuidade visual, exames laboratoriais, etc.) são agendados rapidamente com emissão imediata do Atestado de Saúde Ocupacional assinado pelo médico examinador.',
              },
              {
                pergunta: 'O MEI (Microempreendedor Individual) precisa de assessoria de SST?',
                resposta:
                  'O MEI sem empregados está dispensado de PGR e PCMSO. No entanto, se o MEI contratar um funcionário CLT, passa a ser obrigatório cumprir as exigências de exames ocupacionais (ASO) e envio dos eventos de SST ao eSocial.',
              },
              {
                pergunta: 'Como recebo o laudo executivo e a Ficha Técnica após a contratação por R$ 19,90?',
                resposta:
                  'Assim que o pagamento via PIX ou Cartão for aprovado, seu token de acesso é gerado na hora e você é redirecionado para a Ficha Técnica. Além disso, nosso sistema envia o link direto para o seu WhatsApp e e-mail cadastrados para que você responda sem pressa e receba o parecer conclusivo.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <button
                  type="button"
                  onClick={() => setFaqAberto(faqAberto === idx ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-slate-900 cursor-pointer"
                >
                  <span>{faq.pergunta}</span>
                  <span className="text-xl font-bold text-blue-600 shrink-0">
                    {faqAberto === idx ? '−' : '+'}
                  </span>
                </button>
                {faqAberto === idx && (
                  <div className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-200 pt-4 bg-white">
                    {faq.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO RICA 5: ATENDIMENTO HUMANIZADO CET */}
      <section id="contato" className="bg-gradient-to-br from-blue-900 via-slate-900 to-blue-950 text-white py-16 sm:py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl p-8 sm:p-12 border border-blue-800 bg-white/5 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full">
              Atendimento Especializado
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Prefere falar com um especialista agora?
            </h3>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Tire dúvidas sobre enquadramento de grau de risco da sua empresa, orçamentos para laudos em lote ou contratos corporativos diretamente no WhatsApp com nossos consultores técnicos.
            </p>
          </div>

          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Acessei%20o%20portal%20da%20CET%20e%20gostaria%20de%20falar%20com%20um%20consultor%20t%C3%A9cnico%20sobre%20SST."
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-base sm:text-lg transition shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 shrink-0"
          >
            <span>📱 Falar com Consultor no WhatsApp</span>
            <span>→</span>
          </a>
        </div>
      </section>

      {/* MODAL DE CHECKOUT TRANSPARENTE ASAAS - R$ 19,90 (PIX E CARTÃO) */}
      {modalCheckoutAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Diagnóstico Completo de SST</h3>
                  <p className="text-xs text-slate-400">Checkout Transparente Oficial Asaas • R$ 19,90</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalCheckoutAberto(false);
                  if (pollingRef.current) clearInterval(pollingRef.current);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {pagamentoConcluido ? (
                <div className="text-center py-6 space-y-5 animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-4xl font-black shadow-inner">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-slate-900">
                      Pagamento Aprovado com Sucesso!
                    </h4>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Seu Diagnóstico Técnico de SST foi liberado. Acesse a <strong>Ficha Técnica</strong> da empresa para emissão do laudo conclusivo com as assinaturas periciais.
                    </p>
                  </div>

                  <div className="pt-3">
                    <Link
                      href={tokenFicha ? `/ficha/${tokenFicha}` : '/ficha'}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-6 rounded-2xl text-base transition shadow-lg"
                    >
                      <span>Acessar Ficha Técnica & Concluir Diagnóstico</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : !pixCopiaCola ? (
                <form onSubmit={handleProcessarPagamento} className="space-y-5">
                  {/* Seletor de Método de Pagamento */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMetodoCheckout('pix');
                        setErroCheckout('');
                      }}
                      className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        metodoCheckout === 'pix'
                          ? 'bg-white text-emerald-700 shadow-sm'
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
                      className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        metodoCheckout === 'cartao'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>💳 Cartão de Crédito</span>
                    </button>
                  </div>

                  {/* Resumo da Empresa Selecionada */}
                  <div className="bg-blue-50/90 rounded-2xl p-4 border border-blue-200 text-sm text-blue-900 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-base text-blue-950">
                        {empresaSelecionada?.razao_social || 'Sua Empresa'}
                      </div>
                      <div className="font-mono text-xs text-blue-800 mt-0.5">
                        CNPJ: {empresaSelecionada?.cnpj}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 uppercase block font-semibold">Valor Único</span>
                      <span className="text-xl font-black text-emerald-700">R$ 19,90</span>
                    </div>
                  </div>

                  {erroCheckout && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-900 flex items-start gap-2.5">
                      <span className="text-red-600 font-bold text-base shrink-0">⚠️</span>
                      <p>{erroCheckout}</p>
                    </div>
                  )}

                  {/* DADOS DO RESPONSÁVEL */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Seu Nome Completo:
                      </label>
                      <input
                        type="text"
                        required
                        value={nomeLead}
                        onChange={(e) => setNomeLead(e.target.value)}
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          WhatsApp:
                        </label>
                        <input
                          type="tel"
                          required
                          value={whatsappLead}
                          onChange={(e) => setWhatsappLead(e.target.value)}
                          placeholder="(11) 98765-4321"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          E-mail (opcional):
                        </label>
                        <input
                          type="email"
                          value={emailLead}
                          onChange={(e) => setEmailLead(e.target.value)}
                          placeholder="contato@empresa.com.br"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>CPF ou CNPJ do Pagador:</span>
                        <span className="text-xs text-emerald-700 font-bold">✓ Exigência Banco Central</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={18}
                        value={docPagador}
                        onChange={(e) => setDocPagador(formatarCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden bg-slate-50 focus:bg-white transition"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        O Banco Central exige CPF ou CNPJ válido do pagador para registrar a cobrança oficial no Asaas.
                      </p>
                    </div>
                  </div>

                  {/* CARTÃO DE CRÉDITO */}
                  {metodoCheckout === 'cartao' && (
                    <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Dados do Cartão de Crédito</span>
                        <span className="text-xs text-slate-500">🔒 Ambiente Seguro Asaas</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Número do Cartão:
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={numeroCartao}
                          onChange={(e) => setNumeroCartao(formatarNumeroCartao(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm font-mono tracking-wide focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nome Impresso no Cartão:
                        </label>
                        <input
                          type="text"
                          required
                          value={nomeCartao}
                          onChange={(e) => setNomeCartao(e.target.value.toUpperCase())}
                          placeholder="NOME COMO NO CARTAO"
                          className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm uppercase focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Validade:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={validadeCartao}
                            onChange={(e) => setValidadeCartao(formatarValidade(e.target.value))}
                            placeholder="MM/AA"
                            className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-center font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            CVV:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={4}
                            value={cvvCartao}
                            onChange={(e) => setCvvCartao(e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-center font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            CPF do Titular:
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={14}
                            value={cpfCartao}
                            onChange={(e) => setCpfCartao(formatarCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            CEP (opcional):
                          </label>
                          <input
                            type="text"
                            maxLength={9}
                            value={cepCartao}
                            onChange={(e) => setCepCartao(e.target.value)}
                            placeholder="00000-000"
                            className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOTÃO DE CHECKOUT */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={gerandoCheckout}
                      className={`w-full text-white font-extrabold py-4 px-6 rounded-2xl text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        metodoCheckout === 'cartao'
                          ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      }`}
                    >
                      {gerandoCheckout ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
                <div className="space-y-5 text-center animate-fade-in">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center justify-between">
                    <span>Cobrança PIX Registrada no Banco Central</span>
                    <span className="font-extrabold text-base">R$ 19,90</span>
                  </div>

                  {pixQrCode && (
                    <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 rounded-3xl shadow-inner w-fit mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pixQrCode}
                        alt="QR Code PIX"
                        className="w-56 h-56 rounded-xl object-contain"
                      />
                      <span className="text-xs text-slate-500 mt-2 font-medium">
                        Aponte a câmera do aplicativo do seu banco
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      PIX Copia e Cola:
                    </label>
                    <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 break-all select-all border border-slate-200 max-h-24 overflow-y-auto">
                      {pixCopiaCola}
                    </div>
                    <button
                      type="button"
                      onClick={copiarPix}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>{copiado ? '✓ Código Copiado para a Área de Transferência!' : '📋 Copiar Código PIX'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs sm:text-sm text-blue-900 flex items-center justify-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                    <span>Aguardando confirmação bancária... A liberação é imediata.</span>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={verificandoPagamento}
                      onClick={() => pedidoId && checarStatusPagamento(pedidoId, false)}
                      className="text-sm text-blue-700 hover:text-blue-900 font-bold py-1.5 underline underline-offset-4 cursor-pointer"
                    >
                      {verificandoPagamento ? 'Consultando no Asaas...' : 'Já paguei, verificar agora'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPixCopiaCola('');
                        setPixQrCode('');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
                    >
                      ← Trocar forma de pagamento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ INSTITUCIONAL CLÍNICO EXPANDIDO */}
      <footer className="mt-auto border-t border-slate-300 bg-white text-slate-600 pt-14 pb-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-cet.png" alt="CET" className="w-10 h-10 rounded-lg object-contain" />
                <span className="text-xl font-black text-slate-900">CET CLÍNICA</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Clínica Especializada no Trabalho Ltda. Assessoria completa em Medicina Ocupacional e Engenharia de Segurança em conformidade com as Normas Regulamentadoras da Portaria MTP 672.
              </p>
              <div className="text-xs text-slate-400 font-mono">
                CNPJ Oficial: 14.281.828/0001-85
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Serviços Oficiais</h4>
              <ul className="text-xs sm:text-sm space-y-1.5 text-slate-500">
                <li>• PGR — NR-01 (Gerenciamento de Riscos)</li>
                <li>• PCMSO — NR-07 (Controle Médico)</li>
                <li>• ASO — Exames Ocupacionais Admissionais</li>
                <li>• LTCAT — Laudo Previdenciário</li>
                <li>• Transmissão de Eventos SST no eSocial</li>
                <li>• Laudos de Insalubridade e Periculosidade</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Corpo Pericial</h4>
              <ul className="text-xs sm:text-sm space-y-1.5 text-slate-500">
                <li>• Responsabilidade Técnica Médica (CRM)</li>
                <li>• Engenharia de Segurança do Trabalho (CREA)</li>
                <li>• Emissão de ART para Laudos Ocupacionais</li>
                <li>• Validade Jurídica em Todo o Território Nacional</li>
                <li>• Envio dos eventos S-2210, S-2220 e S-2240</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Atendimento & Suporte</h4>
              <div className="text-xs sm:text-sm space-y-1.5 text-slate-500">
                <p>📍 São Paulo - SP | Atendimento em todo o Brasil</p>
                <p>🕒 Seg a Sex das 08h às 18h</p>
                <p>📞 Suporte Telefônico e WhatsApp</p>
                <p className="pt-2">
                  <Link href="/privacidade" className="text-blue-600 hover:underline font-semibold">
                    Política de Privacidade & LGPD →
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
            <p>© {new Date().getFullYear()} CET — Clínica Especializada no Trabalho. Todos os direitos reservados.</p>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
