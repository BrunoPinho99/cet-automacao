'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SaudeData {
  status: string;
  banco_dados: string;
  filas: {
    relatorios: { waiting?: number; active?: number; completed?: number; failed?: number } | string;
    ploomes: { waiting?: number; active?: number; completed?: number; failed?: number } | string;
  };
  outbox: {
    dead_events: number;
    pending_events: number;
  };
  sla: {
    tempo_medio_processamento_ms: number;
  };
}

export default function AdminSaudePage() {
  const [data, setData] = useState<SaudeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const carregarSaude = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/saude', {
        headers: { role: 'gestor' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao consultar status');
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha na conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarSaude();
    const timer = setInterval(carregarSaude, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 w-full">
      {/* Header SaaS 2026 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Saúde do Sistema & Filas
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Monitoramento em tempo real do banco de dados PostgreSQL, filas BullMQ e eventos outbox.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            Última verificação: {lastUpdated.toLocaleTimeString('pt-BR')}
          </span>
          <button
            type="button"
            onClick={carregarSaude}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-xs sm:text-sm text-red-700 font-medium flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Indicadores de Infraestrutura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Banco de Dados PostgreSQL */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              PostgreSQL
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                data?.banco_dados === 'conectado' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 capitalize tracking-tight">
            {data?.banco_dados || 'Verificando...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Armazenamento seguro de cadastros e dados de clientes
          </p>
        </div>

        {/* SLA Médio de Processamento */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              SLA Médio
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
            {data?.sla ? `${data.sla.tempo_medio_processamento_ms} ms` : '-'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tempo médio da geração de eventos
          </p>
        </div>

        {/* Eventos Pendentes */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pendentes
            </span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
            {data?.outbox?.pending_events ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Eventos na fila de processamento
          </p>
        </div>

        {/* Fila Morta (DLQ) */}
        <div
          className={`rounded-2xl border p-5 shadow-xs ${
            (data?.outbox?.dead_events || 0) > 0
              ? 'border-red-200 bg-red-50/50'
              : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                (data?.outbox?.dead_events || 0) > 0 ? 'text-red-700' : 'text-slate-400'
              }`}
            >
              Fila de Exceções
            </span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              (data?.outbox?.dead_events || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div
            className={`mt-3 text-2xl font-bold tabular-nums tracking-tight ${
              (data?.outbox?.dead_events || 0) > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {data?.outbox?.dead_events ?? 0}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Eventos não entregues</span>
            {(data?.outbox?.dead_events || 0) > 0 && (
              <Link
                href="/admin/eventos/mortos"
                className="text-[11px] font-semibold text-red-700 underline hover:text-red-900"
              >
                Reprocessar →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Detalhamento das Filas Assíncronas */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Filas de Processamento em Background
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fila Relatórios */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-slate-800">
                Geração de Relatórios e Fichas
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-semibold">
                Operacional
              </span>
            </div>
            {typeof data?.filas.relatorios === 'object' && data?.filas.relatorios ? (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Aguardando</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                    {data.filas.relatorios.waiting ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Executando</div>
                  <div className="font-bold text-blue-600 text-sm mt-0.5 tabular-nums">
                    {data.filas.relatorios.active ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Concluídos</div>
                  <div className="font-bold text-emerald-600 text-sm mt-0.5 tabular-nums">
                    {data.filas.relatorios.completed ?? 0}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Status: {String(data?.filas.relatorios || 'Aguardando jobs')}
              </p>
            )}
          </div>

          {/* Fila Ploomes */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-slate-800">
                Sincronização CRM Corporativo
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-semibold">
                Operacional
              </span>
            </div>
            {typeof data?.filas.ploomes === 'object' && data?.filas.ploomes ? (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Aguardando</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                    {data.filas.ploomes.waiting ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Executando</div>
                  <div className="font-bold text-blue-600 text-sm mt-0.5 tabular-nums">
                    {data.filas.ploomes.active ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-medium">Concluídos</div>
                  <div className="font-bold text-emerald-600 text-sm mt-0.5 tabular-nums">
                    {data.filas.ploomes.completed ?? 0}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Status: {String(data?.filas.ploomes || 'Aguardando jobs')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
