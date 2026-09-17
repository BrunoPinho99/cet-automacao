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

export default function AtendimentoClient({ leads, usuarioLogadoId }: { leads: Lead[], usuarioLogadoId: string }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterCanal, setFilterCanal] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const filteredLeads = leads.filter(lead => {
    if (filterCanal !== 'todos' && lead.canal !== filterCanal) return false;
    if (filterStatus === 'robo' && lead.atendente_id) return false;
    if (filterStatus === 'humano' && !lead.atendente_id) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Atendimento</h2>
          <div className="flex space-x-2">
            <select
              className="flex-1 bg-gray-100 border-transparent rounded text-sm px-2 py-1"
              value={filterCanal}
              onChange={(e) => setFilterCanal(e.target.value)}
            >
              <option value="todos">Todos os canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
            <select
              className="flex-1 bg-gray-100 border-transparent rounded text-sm px-2 py-1"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="robo">Com Robô</option>
              <option value="humano">Em Atendimento</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedLeadId === lead.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-900">{lead.contato.nome}</span>
                <span className="text-xs text-gray-500">{lead.canal}</span>
              </div>
              <div className="text-sm text-gray-600 truncate mt-1">
                {lead.mensagens.length > 0 ? lead.mensagens[lead.mensagens.length - 1].conteudo : 'Sem mensagens'}
              </div>
              <div className="mt-2 text-xs font-semibold">
                {lead.atendente_id ? (
                  <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Humano</span>
                ) : (
                  <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">Robô</span>
                )}
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">Nenhuma conversa encontrada.</div>
          )}
        </div>
      </div>

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedLead.contato.nome}</h3>
                <p className="text-xs text-gray-500">{selectedLead.contato.telefone_e164} • {selectedLead.protocolo}</p>
              </div>
              <div>
                {selectedLead.atendente_id ? (
                  <button 
                    onClick={() => devolverParaRobo(selectedLead.id)}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Devolver ao Robô
                  </button>
                ) : (
                  <button 
                    onClick={() => assumirAtendimento(selectedLead.id)}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Assumir Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedLead.mensagens.map(msg => {
                const isSystem = msg.direcao === 'saida';
                return (
                  <div key={msg.id} className={`flex flex-col ${isSystem ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${isSystem ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">
                      {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {isSystem && <span className="ml-1">• {msg.status}</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {selectedLead.atendente_id ? (
                <form action={enviarMensagemManual} className="flex gap-2">
                  <input type="hidden" name="leadId" value={selectedLead.id} />
                  <input 
                    type="text" 
                    name="conteudo"
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Enviar
                  </button>
                </form>
              ) : (
                <div className="text-center p-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  Assuma o atendimento para poder enviar mensagens manualmente.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione uma conversa ao lado para iniciar.
          </div>
        )}
      </div>
    </div>
  );
}
