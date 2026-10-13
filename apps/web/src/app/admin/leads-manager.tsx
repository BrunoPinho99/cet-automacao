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

  // Atualizar lista a partir do servidor
  const refreshLeads = async () => {
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      if (data.success && data.leads) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error('Erro ao recarregar leads:', e);
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

      {/* Header com Ação Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Leads e Gestão SST
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Gerencie empresas, contatos, triagens automáticas e status comercial.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={refreshLeads}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <span>🔄</span> Atualizar
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-500 transition shadow-blue-500/20"
          >
            <span className="text-sm sm:text-base font-bold">+</span> Novo Lead / Empresa
          </button>
        </div>
      </div>

      {/* Cards de Métricas em Azul, Verde e Branco */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
            Total de Clientes
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{metrics.total}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-blue-700 uppercase tracking-wide truncate">
            Grande Porte (100+)
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-blue-900">{metrics.rotaA}</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide truncate">
            Médio Porte (20 a 99)
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{metrics.rotaB}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wide truncate">
            Pequeno Porte (até 19)
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-900">{metrics.rotaC}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 xl:col-span-1 rounded-xl border border-emerald-100 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wide truncate">
            Pagos / Fechados
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-800">{metrics.pagos}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-xl bg-white p-3.5 sm:p-4 border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Empresa, CNPJ, Contato, Telefone..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Porte da Empresa:</span>
            <select
              value={rotaFilter}
              onChange={(e) => setRotaFilter(e.target.value)}
              className="rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs sm:text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden bg-white"
            >
              <option value="todas">Todos os portes</option>
              <option value="A">Grande porte (100+ func.)</option>
              <option value="B">Médio porte (20 a 99 func.)</option>
              <option value="C">Pequeno porte (até 19 func.)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Pagamento:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs sm:text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden bg-white"
            >
              <option value="todos">Todos os status</option>
              <option value="pago">Pago / Confirmado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Leads com Contenção de Overflow */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3.5 pl-4 sm:pl-6 pr-3 min-w-[220px]">Empresa / CNPJ</th>
                <th scope="col" className="px-3 py-3.5 min-w-[180px]">Contato</th>
                <th scope="col" className="px-3 py-3.5 min-w-[140px]">Funcionários & Local</th>
                <th scope="col" className="px-3 py-3.5 min-w-[140px]">Porte da Empresa</th>
                <th scope="col" className="px-3 py-3.5 min-w-[120px]">Pagamento</th>
                <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right min-w-[140px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum lead encontrado com os filtros aplicados.
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

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Empresa / CNPJ */}
                      <td className="py-3.5 pl-4 sm:pl-6 pr-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {empresa?.nome_fantasia || empresa?.razao_social || 'Sem Nome'}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {formatCnpj(empresa?.cnpj)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {lead.protocolo}
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="px-3 py-3.5">
                        <div className="font-medium text-slate-800">
                          {contato?.nome || 'Contato não inf.'}
                        </div>
                        {contato?.telefone_e164 && (
                          <a
                            href={`https://wa.me/${contato.telefone_e164.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-mono mt-0.5"
                          >
                            <span>💬</span> {formatTelefone(contato.telefone_e164)}
                          </a>
                        )}
                        {contato?.email && (
                          <div className="text-xs text-slate-400 truncate max-w-[160px]">
                            {contato.email}
                          </div>
                        )}
                      </td>

                      {/* Porte & Cidade */}
                      <td className="px-3 py-3.5 text-slate-600">
                        <div className="font-medium">{empresa?.cidade || '-'}/{empresa?.uf || '-'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {empresa?.trabalhadores_proprios ?? 0} própr. / {empresa?.trabalhadores_terceiros ?? 0} terc.
                        </div>
                      </td>

                      {/* Porte da Empresa */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {(() => {
                          const p = infoPorte(rota);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                rota === 'A'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : rota === 'B'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                  : rota === 'C'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.nome}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Pagamento */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPago
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPago ? 'Confirmado' : 'Pendente'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Ver detalhes"
                          >
                            👁️ Ver
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Editar Lead"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(lead)}
                            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
                            title="Excluir Lead"
                          >
                            🗑️ Excluir
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
                  className="rounded-lg bg-amber-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-amber-500 disabled:opacity-50 transition"
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
