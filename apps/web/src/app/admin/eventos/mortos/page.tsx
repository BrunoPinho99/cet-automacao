"use client";

import { useState, useEffect } from 'react';

type Evento = {
  event_id: string;
  tipo: string;
  payload: any;
  status: string;
  tentativas: number;
  erro: string | null;
  criado_em: string;
};

export default function EventosMortosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      const res = await fetch('/api/admin/eventos/mortos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id })
      });
      if (res.ok) {
        alert('Evento retornado para a fila de processamento.');
        fetchEventos();
      } else {
        const err = await res.json();
        alert('Erro: ' + err.erro);
      }
    } catch (e) {
      alert('Erro de comunicação.');
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-semibold leading-6 text-gray-900">Eventos Mortos (Dead-Letter)</h2>
          <p className="mt-2 text-sm text-gray-700">
            Lista de eventos que falharam após o limite máximo de tentativas.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={fetchEventos}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Atualizar
          </button>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">Carregando...</p>
              ) : eventos.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">Nenhum evento na fila morta.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Tipo</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Erro</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Criado em</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {eventos.map((evento) => (
                      <tr key={evento.event_id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {evento.tipo}
                        </td>
                        <td className="px-3 py-4 text-sm text-red-600 max-w-xs truncate" title={evento.erro || ''}>
                          {evento.erro || 'Desconhecido'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(evento.criado_em).toLocaleString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleReprocessar(evento.event_id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Reprocessar
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
      </div>
    </div>
  );
}
