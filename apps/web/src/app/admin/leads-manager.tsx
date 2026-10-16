'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { infoPorte, OPCOES_PORTE } from '@/lib/porte';

interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cidade: string | null;
  uf: string | null;
  trabalhadores_proprios: number;
  trabalhadores_terceiros: number;
  unidades: number;
  grau_risco: number | null;
}

interface Contato {
  id: string;
  nome: string;
  telefone_e164: string;
  email: string | null;
}

interface Rota {
  id: string;
  rota: string;
  sla_minutos: number;
}

interface Ficha {
  id: string;
  status: string;
  rota: Rota | null;
}

interface Pedido {
  id: string;
  status: string;
  valor_centavos: number;
}

export interface LeadItem {
  id: string;
  protocolo: string;
  canal: string;
  criado_em: string | Date;
  empresa: Empresa | null;
  contato?: Contato | null;
  pedidos: Pedido[];
  fichas: Ficha[];
}

interface LeadsManagerProps {
  initialLeads: LeadItem[];
}

export function LeadsManager({ initialLeads }: LeadsManagerProps) {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState('');
  const [rotaFilter, setRotaFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Estados de formulário
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Formulário de Criação / Edição
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    cidade: 'São Paulo',
    uf: 'SP',
    trabalhadores_proprios: 10,
    trabalhadores_terceiros: 0,
    grau_risco: 2,
    contato_nome: '',
    contato_telefone: '',
    contato_email: '',
    rota: 'A',
    status_pagamento: 'pendente',
    valor_estimado: '1500',
    canal: 'whatsapp',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const [loading, setLoading] = useState(false);

  // Atualizar lista a partir do servidor
  const refreshLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      if (data.success && data.leads) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error('Erro ao recarregar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      cidade: 'São Paulo',
      uf: 'SP',
      trabalhadores_proprios: 15,
      trabalhadores_terceiros: 5,
      grau_risco: 2,
      contato_nome: '',
      contato_telefone: '',
      contato_email: '',
      rota: 'A',
      status_pagamento: 'pendente',
      valor_estimado: '1800',
      canal: 'whatsapp',
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (lead: LeadItem) => {
    setSelectedLead(lead);
    const empresa = lead.empresa;
    const contato = lead.contato;
    const pedido = lead.pedidos[0];
    const ficha = lead.fichas[0];

    setFormData({
      razao_social: empresa?.razao_social || '',
      nome_fantasia: empresa?.nome_fantasia || '',
      cnpj: empresa?.cnpj || '',
      cidade: empresa?.cidade || 'São Paulo',
      uf: empresa?.uf || 'SP',
      trabalhadores_proprios: empresa?.trabalhadores_proprios || 0,
      trabalhadores_terceiros: empresa?.trabalhadores_terceiros || 0,
      grau_risco: empresa?.grau_risco || 1,
      contato_nome: contato?.nome || '',
      contato_telefone: contato?.telefone_e164 || '',
      contato_email: contato?.email || '',
      rota: ficha?.rota?.rota || 'A',
      status_pagamento: pedido?.status || 'pendente',
      valor_estimado: pedido?.valor_centavos ? String(pedido.valor_centavos / 100) : '1500',
      canal: lead.canal || 'whatsapp',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  // Abrir modal de exclusão
  const handleOpenDelete = (lead: LeadItem) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  // Submeter Criação
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erro ao criar lead');
        return;
      }

      setIsCreateOpen(false);
      showToast('Lead e Empresa cadastrados com sucesso!');
      await refreshLeads();
    } catch {
      setFormError('Erro de conexão ao criar lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Submeter Edição
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erro ao atualizar lead');
        return;
      }

      setIsEditOpen(false);
      showToast('Lead atualizado com sucesso!');
      await refreshLeads();
    } catch {
      setFormError('Erro de conexão ao atualizar lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Submeter Exclusão
  const handleConfirmDelete = async () => {
    if (!selectedLead) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir lead');
        return;
      }

      setIsDeleteOpen(false);
      showToast('Lead excluído com sucesso!');
      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
    } catch {
      alert('Erro de conexão ao excluir lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    let rotaA = 0;
    let rotaB = 0;
    let rotaC = 0;
    let pagos = 0;

    leads.forEach((l) => {
      const r = l.fichas[0]?.rota?.rota;
      if (r === 'A') rotaA++;
      else if (r === 'B') rotaB++;
      else if (r === 'C') rotaC++;

      const st = l.pedidos[0]?.status?.toLowerCase();
      if (st === 'pago' || st === 'confirmado') pagos++;
    });

    return {
      total: leads.length,
      rotaA,
      rotaB,
      rotaC,
      pagos,
    };
  }, [leads]);

  // Filtragem
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const empresa = lead.empresa;
      const contato = lead.contato;
      const rota = lead.fichas[0]?.rota?.rota;
      const pedido = lead.pedidos[0];
      const statusPagamento = pedido ? pedido.status.toLowerCase() : 'pendente';

      // Busca texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nomeEmpresa = (empresa?.nome_fantasia || empresa?.razao_social || '').toLowerCase();
        const cnpj = (empresa?.cnpj || '').toLowerCase();
        const nomeContato = (contato?.nome || '').toLowerCase();
        const tel = (contato?.telefone_e164 || '').toLowerCase();
        const protocolo = lead.protocolo.toLowerCase();

        const match =
          nomeEmpresa.includes(query) ||
          cnpj.includes(query) ||
          nomeContato.includes(query) ||
          tel.includes(query) ||
          protocolo.includes(query);

        if (!match) return false;
      }

      // Filtro Rota
      if (rotaFilter !== 'todas') {
        if (rota !== rotaFilter) return false;
      }

      // Filtro Pagamento
      if (statusFilter !== 'todos') {
        const isPago = statusPagamento === 'pago' || statusPagamento === 'confirmado';
        if (statusFilter === 'pago' && !isPago) return false;
        if (statusFilter === 'pendente' && isPago) return false;
      }

      return true;
    });
  }, [leads, searchTerm, rotaFilter, statusFilter]);

  const formatCnpj = (cnpj?: string) => {
    if (!cnpj) return '-';
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return cnpj;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatTelefone = (tel?: string) => {
    if (!tel) return '-';
    const clean = tel.replace(/\D/g, '');
    if (clean.length === 13) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return tel;
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 animate-fade-in max-w-md">
          <span className="text-emerald-400 font-bold">✓</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header com Ação Principal — SaaS 2026 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Gestão Ativa
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-mono">
              {leads.length} cadastros no sistema
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Clientes e Triagem SST
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Acompanhe o porte das empresas, dados de contato e status de pagamento em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={refreshLeads}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo Cadastro</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas SaaS 2026: Branco, Azul e Verde */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Empresas
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {metrics.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Cadastros no painel
          </div>
        </div>

        {/* Card 2: Grande Porte */}
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 sm:p-4.5 shadow-2xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Grande Porte
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-blue-900 tabular-nums">
            {metrics.rotaA}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-700">
            100+ func. • SLA 10 min
          </div>
        </div>

        {/* Card 3: Médio Porte */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Médio Porte
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 tabular-nums">
            {metrics.rotaB}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            20 a 99 func. • SLA 2h
          </div>
        </div>

        {/* Card 4: Pequeno Porte */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 sm:p-4.5 shadow-2xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Pequeno Porte
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-900 tabular-nums">
            {metrics.rotaC}
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-700">
            Até 19 func. • Digital
          </div>
        </div>

        {/* Card 5: Pagos */}
        <div className="col-span-2 sm:col-span-1 xl:col-span-1 rounded-2xl border border-emerald-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Pagamentos
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
              R$
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-800 tabular-nums">
            {metrics.pagos}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Confirmados / Pagos
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca SaaS 2026 */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Empresa, CNPJ, Contato, Telefone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/10 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Porte:</span>
            <select
              value={rotaFilter}
              onChange={(e) => setRotaFilter(e.target.value)}
              className="rounded-xl border border-slate-200 py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-hidden bg-white shadow-2xs"
            >
              <option value="todas">Todos os portes</option>
              <option value="A">Grande porte (100+ func.)</option>
              <option value="B">Médio porte (20 a 99 func.)</option>
              <option value="C">Pequeno porte (até 19 func.)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Pagamento:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-hidden bg-white shadow-2xs"
            >
              <option value="todos">Todos os status</option>
              <option value="pago">Pago / Confirmado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <div className="text-[11px] font-medium text-slate-400 hidden xl:inline pl-2 border-l border-slate-200">
            {filteredLeads.length} de {leads.length}
          </div>
        </div>
      </div>

      {/* Tabela de Leads SaaS 2026 */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3.5 pl-5 sm:pl-6 pr-3 min-w-[230px]">Empresa / CNPJ</th>
                <th scope="col" className="px-3 py-3.5 min-w-[180px]">Contato Principal</th>
                <th scope="col" className="px-3 py-3.5 min-w-[130px]">Porte da Empresa</th>
                <th scope="col" className="px-3 py-3.5 min-w-[130px]">Status Pagamento</th>
                <th scope="col" className="px-3 py-3.5 min-w-[140px]">Equipe & Local</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 sm:pr-6 text-right min-w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">Nenhum registro encontrado</p>
                      <p className="text-xs text-slate-400 mt-0.5">Tente limpar os filtros ou realizar outra busca.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const empresa = lead.empresa;
                  const contato = lead.contato;
                  const pedido = lead.pedidos[0];
                  const ficha = lead.fichas[0];
                  const rota = ficha?.rota?.rota || '-';
                  const isPago = pedido?.status?.toLowerCase() === 'pago' || pedido?.status?.toLowerCase() === 'confirmado';

                  const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || 'Empresa sem nome';
                  const inicial = (empresa?.nome_fantasia || empresa?.razao_social || 'C').slice(0, 2).toUpperCase();

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Empresa / CNPJ */}
                      <td className="py-3.5 pl-5 sm:pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100/90 shadow-2xs">
                            {inicial}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/leads/${lead.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition truncate block leading-snug"
                            >
                              {nomeEmpresa}
                            </Link>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {formatCnpj(empresa?.cnpj)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {lead.protocolo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="px-3 py-3.5">
                        <div className="font-medium text-slate-800">
                          {contato?.nome || 'Não informado'}
                        </div>
                        {contato?.telefone_e164 && (
                          <a
                            href={`https://wa.me/${contato.telefone_e164.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium mt-0.5"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{formatTelefone(contato.telefone_e164)}</span>
                          </a>
                        )}
                        {contato?.email && (
                          <div className="text-xs text-slate-400 truncate max-w-[160px]">
                            {contato.email}
                          </div>
                        )}
                      </td>

                      {/* Porte da Empresa */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {(() => {
                          const p = infoPorte(rota);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                rota === 'A'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : rota === 'B'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                  : rota === 'C'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  rota === 'A' ? 'bg-blue-600' : rota === 'C' ? 'bg-emerald-600' : 'bg-slate-500'
                                }`}
                              />
                              {p.nome}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status Pagamento */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPago
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isPago ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                          {isPago ? 'Confirmado' : 'Pendente'}
                        </span>
                        {pedido?.valor_centavos ? (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            R$ {(pedido.valor_centavos / 100).toFixed(2).replace('.', ',')}
                          </div>
                        ) : null}
                      </td>

                      {/* Funcionários & Local */}
                      <td className="px-3 py-3.5 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {empresa?.cidade || '-'}/{empresa?.uf || '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {empresa?.trabalhadores_proprios ?? 0} próprios • {empresa?.trabalhadores_terceiros ?? 0} terc.
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ver detalhes do lead"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Editar Lead"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(lead)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir Lead"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO LEAD (COM HEADER E FOOTER FIXOS) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-5 sm:px-6 py-4 shrink-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Cadastrar Novo Lead & Empresa</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Insira as informações para iniciar o atendimento e triagem SST.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
                {formError && (
                  <div className="p-3 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                    {formError}
                  </div>
                )}

                {/* Seção 1: Empresa */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    1. Dados da Empresa
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CNPJ *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        placeholder="Ex: Alfa Logística"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        placeholder="Ex: Alfa Transportes e Logística LTDA"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        placeholder="São Paulo"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={formData.uf}
                        onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                        placeholder="SP"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Trabalhadores Próprios
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.trabalhadores_proprios}
                        onChange={(e) => setFormData({ ...formData, trabalhadores_proprios: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grau de Risco (1 a 4)
                      </label>
                      <select
                        value={formData.grau_risco}
                        onChange={(e) => setFormData({ ...formData, grau_risco: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        <option value={1}>Grau 1 (Muito Baixo)</option>
                        <option value={2}>Grau 2 (Médio)</option>
                        <option value={3}>Grau 3 (Alto)</option>
                        <option value={4}>Grau 4 (Muito Alto)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Contato */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    2. Dados do Contato Principal
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome do Contato *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contato_nome}
                        onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                        placeholder="Carlos Silva"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone / WhatsApp *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contato_telefone}
                        onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                        placeholder="(11) 98888-7777"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.contato_email}
                        onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                        placeholder="carlos@empresa.com.br"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Porte da Empresa e Pagamento */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    3. Porte da Empresa e Pagamento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Porte da Empresa
                      </label>
                      <select
                        value={formData.rota}
                        onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        {OPCOES_PORTE.map((op) => (
                          <option key={op.valor} value={op.valor}>
                            {op.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status do Pagamento
                      </label>
                      <select
                        value={formData.status_pagamento}
                        onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Confirmado / Pago</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Valor Estimado (R$)
                      </label>
                      <input
                        type="number"
                        value={formData.valor_estimado}
                        onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                        placeholder="1500"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Fixo */}
              <div className="flex justify-end gap-3 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {submitting ? 'Cadastrando...' : 'Salvar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LEAD (COM HEADER E FOOTER FIXOS) */}
      {isEditOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-5 sm:px-6 py-4 shrink-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Editar Lead</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Protocolo: {selectedLead.protocolo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
                {formError && (
                  <div className="p-3 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                    {formError}
                  </div>
                )}

                {/* Empresa */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    1. Dados da Empresa
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CNPJ
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={formData.uf}
                        onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Trabalhadores Próprios
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.trabalhadores_proprios}
                        onChange={(e) => setFormData({ ...formData, trabalhadores_proprios: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grau de Risco
                      </label>
                      <select
                        value={formData.grau_risco}
                        onChange={(e) => setFormData({ ...formData, grau_risco: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        <option value={1}>Grau 1</option>
                        <option value={2}>Grau 2</option>
                        <option value={3}>Grau 3</option>
                        <option value={4}>Grau 4</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    2. Dados do Contato
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={formData.contato_nome}
                        onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formData.contato_telefone}
                        onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.contato_email}
                        onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Porte & Pagamento */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5">
                    3. Porte da Empresa e Pagamento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Porte da Empresa
                      </label>
                      <select
                        value={formData.rota}
                        onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        {OPCOES_PORTE.map((op) => (
                          <option key={op.valor} value={op.valor}>
                            {op.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status do Pagamento
                      </label>
                      <select
                        value={formData.status_pagamento}
                        onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-hidden bg-white"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Confirmado / Pago</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Fixo */}
              <div className="flex justify-end gap-3 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR LEAD */}
      {isDeleteOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 text-2xl mb-3">
                ⚠️
              </div>
              <h2 className="text-lg font-bold text-slate-900">Excluir Lead e Registros?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir o lead{' '}
                <strong className="text-slate-800">
                  {selectedLead.empresa?.nome_fantasia || selectedLead.empresa?.razao_social}
                </strong>{' '}
                ({selectedLead.protocolo})?
              </p>
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100">
                Esta ação apagará fichas, histórico, relatórios e mensagens vinculadas a este lead.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="w-1/2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="w-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 transition"
              >
                {submitting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
