'use client';

import { useState, useEffect } from 'react';

type Evento = {
  event_id: string;
  tipo: string;
  payload: unknown;
  status: string;
  tentativas: number;
  erro: string | null;
  criado_em: string;
};

export default function EventosMortosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/eventos/mortos');
      const data = await res.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const handleReprocessar = async (event_id: string) => {
    setReprocessingId(event_id);
    try {
      const res = await fetch('/api/admin/eventos/mortos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id }),
      });
      if (res.ok) {
        setMessage('Evento retornado para a fila de processamento com sucesso.');
        setTimeout(() => setMessage(null), 3500);
        fetchEventos();
      } else {
        const err = await res.json();
        alert('Erro ao reprocessar: ' + (err.erro || 'Desconhecido'));
      }
    } catch {
      alert('Erro de comunicação.');
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold p-1">✕</button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/70 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Envios com Falha
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Eventos que falharam após tentativas automáticas e podem ser reenviados manualmente.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchEventos}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-2xs disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Tabela de Eventos */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs sm:text-sm text-slate-400">
              Carregando lista de eventos...
            </div>
          ) : eventos.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Nenhum envio pendente de correção
              </p>
              <p className="text-xs text-slate-500">
                Todas as integrações e notificações foram entregues com sucesso.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">Tipo</th>
                  <th scope="col" className="px-3 py-3.5">Último Retorno</th>
                  <th scope="col" className="px-3 py-3.5">Data / Hora</th>
                  <th scope="col" className="px-3 py-3.5">Tentativas</th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventos.map((evento) => (
                  <tr key={evento.event_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-xs text-slate-900">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-slate-700 border border-slate-200">
                        {evento.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-600 max-w-sm truncate" title={evento.erro || ''}>
                      {evento.erro || 'Erro não informado'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-xs font-mono text-slate-500">
                      {new Date(evento.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-700">
                      {evento.tentativas}x
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleReprocessar(evento.event_id)}
                        disabled={reprocessingId === evento.event_id}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition disabled:opacity-50"
                      >
                        {reprocessingId === evento.event_id ? 'Enviando...' : 'Reenviar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
