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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>💓</span> Saúde do Sistema & Filas
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Monitoramento em tempo real do banco de dados, filas BullMQ e orquestrador de eventos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Última checagem: {lastUpdated.toLocaleTimeString('pt-BR')}
          </span>
          <button
            type="button"
            onClick={carregarSaude}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <span>{loading ? '⏳' : '🔄'}</span> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Grid de Indicadores de Infraestrutura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Banco de Dados PostgreSQL */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              PostgreSQL
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                data?.banco_dados === 'conectado' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 capitalize">
            {data?.banco_dados || 'Verificando...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Fonte da verdade para leads, empresas e auditoria
          </p>
        </div>

        {/* SLA Médio de Processamento */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              SLA Médio (Outbox)
            </span>
            <span className="text-base">⚡</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
            {data?.sla ? `${data.sla.tempo_medio_processamento_ms} ms` : '-'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tempo médio da geração ao envio assíncrono
          </p>
        </div>

        {/* Eventos Pendentes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Eventos Pendentes
            </span>
            <span className="text-base">📦</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
            {data?.outbox?.pending_events ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Aguardando processamento na fila
          </p>
        </div>

        {/* Fila Morta (DLQ) */}
        <div
          className={`rounded-xl border p-4 shadow-xs ${
            (data?.outbox?.dead_events || 0) > 0
              ? 'border-red-200 bg-red-50/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                (data?.outbox?.dead_events || 0) > 0 ? 'text-red-700' : 'text-slate-500'
              }`}
            >
              Fila Morta (DLQ)
            </span>
            <span className="text-base">⚠️</span>
          </div>
          <div
            className={`mt-2 text-xl sm:text-2xl font-bold ${
              (data?.outbox?.dead_events || 0) > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {data?.outbox?.dead_events ?? 0}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Eventos falhos</span>
            {(data?.outbox?.dead_events || 0) > 0 && (
              <Link
                href="/admin/eventos/mortos"
                className="text-[11px] font-semibold text-red-700 underline hover:text-red-900"
              >
                Ver e Reprocessar →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Detalhamento das Filas BullMQ / Redis */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Filas de Processamento Assíncrono (BullMQ / Redis)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fila Relatórios */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-slate-800">
                📄 Fila de Geração de Relatórios SST (Puppeteer)
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                Ativo
              </span>
            </div>
            {typeof data?.filas.relatorios === 'object' && data?.filas.relatorios ? (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Aguardando</div>
                  <div className="font-bold text-slate-900 text-sm">
                    {data.filas.relatorios.waiting ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Processando</div>
                  <div className="font-bold text-blue-600 text-sm">
                    {data.filas.relatorios.active ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Concluídos</div>
                  <div className="font-bold text-emerald-600 text-sm">
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
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-slate-800">
                🔄 Fila de Sincronização Ploomes CRM
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                Ativo
              </span>
            </div>
            {typeof data?.filas.ploomes === 'object' && data?.filas.ploomes ? (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Aguardando</div>
                  <div className="font-bold text-slate-900 text-sm">
                    {data.filas.ploomes.waiting ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Processando</div>
                  <div className="font-bold text-blue-600 text-sm">
                    {data.filas.ploomes.active ?? 0}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase">Concluídos</div>
                  <div className="font-bold text-emerald-600 text-sm">
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
