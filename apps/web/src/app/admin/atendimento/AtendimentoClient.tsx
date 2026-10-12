'use client';

import { useState } from 'react';
import { assumirAtendimento, devolverParaRobo, enviarMensagemManual } from './actions';

type Mensagem = {
  id: string;
  conteudo: string;
  direcao: string;
  criado_em: Date;
  status: string;
};

type Lead = {
  id: string;
  protocolo: string;
  canal: string;
  atendente_id: string | null;
  contato: {
    nome: string;
    telefone_e164: string;
  };
  mensagens: Mensagem[];
};

export default function AtendimentoClient({
  leads,
  usuarioLogadoId,
}: {
  leads: Lead[];
  usuarioLogadoId: string;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterCanal, setFilterCanal] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const filteredLeads = leads.filter((lead) => {
    if (filterCanal !== 'todos' && lead.canal !== filterCanal) return false;
    if (filterStatus === 'robo' && lead.atendente_id) return false;
    if (filterStatus === 'humano' && !lead.atendente_id) return false;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[520px] max-h-[860px] bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full">
      {/* Sidebar - Lista de Conversas */}
      <div
        className={`${
          selectedLead ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 bg-white flex-col h-full overflow-hidden`}
      >
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-800 mb-3">Conversas em Andamento</h2>
          <div className="flex gap-2">
            <select
              className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
              value={filterCanal}
              onChange={(e) => setFilterCanal(e.target.value)}
            >
              <option value="todos">Todos os canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
            <select
              className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="robo">Com Robô</option>
              <option value="humano">Em Atendimento</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`p-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                selectedLeadId === lead.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                  {lead.contato.nome}
                </span>
                <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                  {lead.canal}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate mt-1">
                {lead.mensagens.length > 0
                  ? lead.mensagens[lead.mensagens.length - 1].conteudo
                  : 'Sem mensagens'}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">{lead.protocolo}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    lead.atendente_id
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-emerald-700 bg-emerald-100'
                  }`}
                >
                  {lead.atendente_id ? 'Humano' : 'Robô'}
                </span>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhuma conversa encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Chat Window */}
      <div
        className={`${
          selectedLead ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col bg-slate-50 h-full overflow-hidden`}
      >
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex justify-between items-center gap-3 shrink-0 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  aria-label="Voltar para a lista"
                >
                  ←
                </button>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                    {selectedLead.contato.nome}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate font-mono">
                    {selectedLead.contato.telefone_e164} • {selectedLead.protocolo}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {selectedLead.atendente_id ? (
                  <button
                    onClick={() => devolverParaRobo(selectedLead.id)}
                    className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Devolver ao Robô
                  </button>
                ) : (
                  <button
                    onClick={() => assumirAtendimento(selectedLead.id)}
                    className="bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Assumir Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedLead.mensagens.map((msg) => {
                const isSystem = msg.direcao === 'saida';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSystem ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm ${
                        isSystem
                          ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isSystem && <span className="ml-1">• {msg.status}</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
              {selectedLead.atendente_id ? (
                <form action={enviarMensagemManual} className="flex gap-2">
                  <input type="hidden" name="leadId" value={selectedLead.id} />
                  <input
                    type="text"
                    name="conteudo"
                    placeholder="Digite sua resposta..."
                    className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0"
                  >
                    Enviar
                  </button>
                </form>
              ) : (
                <div className="text-center p-2.5 text-xs text-slate-500 bg-slate-100 rounded-lg font-medium">
                  Assuma o atendimento para responder o cliente manualmente.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Selecione uma conversa para visualizar o histórico e responder.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
