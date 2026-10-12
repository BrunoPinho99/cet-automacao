"use client";

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
        setMessage('Evento retornado para a fila de processamento com sucesso!');
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
        <div className="p-3.5 text-xs sm:text-sm text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 font-medium">
          ✓ {message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>⚠️</span> Fila Morta (Dead-Letter Queue)
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Eventos que falharam após atingir o limite de retentativas. Você pode reprocessá-los manualmente.
          </p>
        </div>
        <div>
          <button
            onClick={fetchEventos}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <span>{loading ? '⏳' : '🔄'}</span> Atualizar
          </button>
        </div>
      </div>

      {/* Tabela de Eventos */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs sm:text-sm text-slate-400">
              Carregando eventos da fila morta...
            </div>
          ) : eventos.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl">🎉</span>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Nenhum evento na fila morta
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Todos os eventos de integração foram processados com sucesso.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">Tipo do Evento</th>
                  <th scope="col" className="px-3 py-3.5">Último Erro</th>
                  <th scope="col" className="px-3 py-3.5">Data / Hora</th>
                  <th scope="col" className="px-3 py-3.5">Tentativas</th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventos.map((evento) => (
                  <tr key={evento.event_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-xs text-slate-900">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {evento.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-rose-600 max-w-sm truncate" title={evento.erro || ''}>
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
                        {reprocessingId === evento.event_id ? 'Enviando...' : 'Reprocessar'}
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
