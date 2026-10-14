'use client';

import { useState } from 'react';
import { requestRegerarPdf, requestSincroniaPloomes } from './actions';
import { OPCOES_PORTE } from '@/lib/porte';

interface ActionsProps {
  leadId: string;
  empresaId: string;
  pedidoId?: string;
  leadData?: {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    cidade: string;
    uf: string;
    trabalhadores_proprios: number;
    trabalhadores_terceiros: number;
    grau_risco: number;
    rota: string;
    status_pagamento: string;
  };
}

export function Actions({ leadId, empresaId, pedidoId, leadData }: ActionsProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [editForm, setEditForm] = useState({
    razao_social: leadData?.razao_social || '',
    nome_fantasia: leadData?.nome_fantasia || '',
    cnpj: leadData?.cnpj || '',
    cidade: leadData?.cidade || '',
    uf: leadData?.uf || '',
    trabalhadores_proprios: leadData?.trabalhadores_proprios || 0,
    trabalhadores_terceiros: leadData?.trabalhadores_terceiros || 0,
    grau_risco: leadData?.grau_risco || 1,
    rota: leadData?.rota || 'A',
    status_pagamento: leadData?.status_pagamento || 'pendente',
  });

  const regerarPdf = async () => {
    if (!pedidoId) {
      alert('Esta empresa ainda não possui um pedido pago/gerado.');
      return;
    }
    setLoadingPdf(true);
    try {
      await requestRegerarPdf(pedidoId);
      alert('Job de Regerar PDF adicionado à fila!');
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Erro: ' + (error as any).message);
    } finally {
      setLoadingPdf(false);
    }
  };

  const forcarSincronia = async () => {
    setLoadingSync(true);
    try {
      await requestSincroniaPloomes(empresaId);
      alert('Job de Sincronia Ploomes adicionado à fila!');
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Erro: ' + (error as any).message);
    } finally {
      setLoadingSync(false);
    }
  };

  const handleExcluirLead = async () => {
    if (!confirm('Tem certeza de que deseja EXCLUIR este lead permanentemente?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir lead');
        return;
      }
      alert('Lead excluído com sucesso!');
      window.location.href = '/admin';
    } catch {
      alert('Erro de conexão ao excluir lead');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao salvar alterações');
        return;
      }
      alert('Lead atualizado com sucesso!');
      setIsEditing(false);
      window.location.reload();
    } catch {
      alert('Erro de conexão ao atualizar lead');
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Editar Dados
        </button>
        <button
          type="button"
          onClick={handleExcluirLead}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 disabled:opacity-50 transition"
        >
          <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {isDeleting ? 'Excluindo...' : 'Excluir Lead'}
        </button>
        <button
          type="button"
          onClick={regerarPdf}
          disabled={loadingPdf}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
        >
          {loadingPdf ? 'Aguarde...' : 'Regerar PDF'}
        </button>
        <button
          type="button"
          onClick={forcarSincronia}
          disabled={loadingSync}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loadingSync ? 'Aguarde...' : 'Sincronizar Ploomes'}
        </button>
      </div>

      {/* Modal de Edição */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Editar Detalhes do Lead</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social</label>
                <input
                  type="text"
                  value={editForm.razao_social}
                  onChange={(e) => setEditForm({ ...editForm, razao_social: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={editForm.nome_fantasia}
                  onChange={(e) => setEditForm({ ...editForm, nome_fantasia: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editForm.cidade}
                    onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editForm.uf}
                    onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trabalhadores Próprios</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.trabalhadores_proprios}
                    onChange={(e) => setEditForm({ ...editForm, trabalhadores_proprios: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trabalhadores Terceiros</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.trabalhadores_terceiros}
                    onChange={(e) => setEditForm({ ...editForm, trabalhadores_terceiros: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Porte da Empresa</label>
                  <select
                    value={editForm.rota}
                    onChange={(e) => setEditForm({ ...editForm, rota: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none bg-white"
                  >
                    {OPCOES_PORTE.map((op) => (
                      <option key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Pagamento</label>
                  <select
                    value={editForm.status_pagamento}
                    onChange={(e) => setEditForm({ ...editForm, status_pagamento: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Confirmado / Pago</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {submittingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
