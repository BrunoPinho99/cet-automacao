'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { assumirAtendimento, devolverParaRobo, limparDadosDemoAction } from './actions';
import Link from 'next/link';

type Mensagem = {
  id: string;
  conteudo: string;
  direcao: string;
  criado_em: string | Date;
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
  empresa?: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
  } | null;
  mensagens: Mensagem[];
};

export default function AtendimentoClient({
  leads: initialLeads,
  usuarioLogadoId: _usuarioLogadoId,
}: {
  leads: Lead[];
  usuarioLogadoId: string;
}) {
  const [leadsList, setLeadsList] = useState<Lead[]>(initialLeads);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeads[0]?.id || null);
  const [filterCanal, setFilterCanal] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [textoResposta, setTextoResposta] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [limpandoDemo, setLimpandoDemo] = useState<boolean>(false);
  const [showConfirmLimpeza, setShowConfirmLimpeza] = useState<boolean>(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Estados para exclusão de mensagens
  const [mensagemParaExcluir, setMensagemParaExcluir] = useState<string | null>(null);
  const [excluindoMensagem, setExcluindoMensagem] = useState<boolean>(false);
  const [showConfirmLimparHistorico, setShowConfirmLimparHistorico] = useState<boolean>(false);
  const [limpandoHistorico, setLimpandoHistorico] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sincronização periódica (Live Polling a cada 3.5s)
  const sincronizarConversas = useCallback(async (silencioso = true) => {
    if (!silencioso) setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/atendimento', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leads)) {
          setLeadsList(data.leads);
          setLastSync(new Date());
        }
      }
    } catch (err) {
      console.error('[Atendimento] Erro na sincronização:', err);
    } finally {
      if (!silencioso) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      sincronizarConversas(true);
    }, 3500);
    return () => clearInterval(timer);
  }, [sincronizarConversas]);

  const selectedLead = leadsList.find((l) => l.id === selectedLeadId);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedLead?.mensagens.length, selectedLeadId]);

  const filteredLeads = leadsList.filter((lead) => {
    if (filterCanal !== 'todos' && lead.canal !== filterCanal) return false;
    if (filterStatus === 'auto' && lead.atendente_id) return false;
    if (filterStatus === 'manual' && !lead.atendente_id) return false;
    return true;
  });

  // Envio de mensagem
  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !textoResposta.trim() || enviando) return;

    const texto = textoResposta.trim();
    setTextoResposta('');
    setEnviando(true);

    // Mensagem otimista no chat
    const tempId = `temp-${Date.now()}`;
    const msgOtimista: Mensagem = {
      id: tempId,
      conteudo: texto,
      direcao: 'saida',
      criado_em: new Date(),
      status: 'enviando...',
    };

    setLeadsList((prev) =>
      prev.map((l) =>
        l.id === selectedLead.id
          ? { ...l, mensagens: [...l.mensagens, msgOtimista] }
          : l
      )
    );

    try {
      const res = await fetch('/api/admin/atendimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          conteudo: texto,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAlerta(`Aviso de envio: ${data.error || 'Não foi possível confirmar envio'}`);
      }
      await sincronizarConversas(true);
    } catch {
      setAlerta('Falha de conexão ao enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  // Excluir mensagem individual
  const handleConfirmExcluirMensagem = async () => {
    if (!mensagemParaExcluir || !selectedLead) return;
    setExcluindoMensagem(true);

    const msgId = mensagemParaExcluir;

    // Atualização otimista
    setLeadsList((prev) =>
      prev.map((l) =>
        l.id === selectedLead.id
          ? { ...l, mensagens: l.mensagens.filter((m) => m.id !== msgId) }
          : l
      )
    );

    try {
      const res = await fetch(`/api/admin/atendimento?mensagemId=${msgId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        await sincronizarConversas(true);
      }
    } catch (err) {
      console.error('[Atendimento] Erro ao excluir mensagem:', err);
      await sincronizarConversas(true);
    } finally {
      setExcluindoMensagem(false);
      setMensagemParaExcluir(null);
    }
  };

  // Limpar todo o histórico de mensagens do lead atual
  const handleConfirmLimparHistorico = async () => {
    if (!selectedLead) return;
    setLimpandoHistorico(true);

    try {
      const res = await fetch(`/api/admin/atendimento?leadId=${selectedLead.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLeadsList((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id ? { ...l, mensagens: [] } : l
          )
        );
        setShowConfirmLimparHistorico(false);
        setAlerta('Mensagens desta conversa apagadas com sucesso.');
        setTimeout(() => setAlerta(null), 5000);
      } else {
        setAlerta('Não foi possível apagar as mensagens.');
      }
    } catch {
      setAlerta('Erro de conexão ao apagar mensagens.');
    } finally {
      setLimpandoHistorico(false);
    }
  };

  // Limpeza de dados demo
  const handleLimparDemo = async () => {
    setLimpandoDemo(true);
    try {
      const res = await limparDadosDemoAction();
      if (res.success) {
        setLeadsList([]);
        setSelectedLeadId(null);
        setShowConfirmLimpeza(false);
        setAlerta('Dados fictícios de demonstração removidos com sucesso.');
        setTimeout(() => setAlerta(null), 7000);
      }
    } catch (err: unknown) {
      setAlerta(err instanceof Error ? err.message : 'Erro ao limpar dados.');
    } finally {
      setLimpandoDemo(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] min-h-[580px] max-h-[920px] w-full">
      {/* Barra Superior de Status: Limpa, Branca e Azul/Verde */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border border-slate-200 rounded-t-xl shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-800 text-xs sm:text-sm">
            Atendimento WhatsApp Conectado
          </span>
          <span className="text-slate-400 text-xs hidden sm:inline">
            • Atualizado às {lastSync.toLocaleTimeString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sincronizarConversas(false)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            title="Atualizar mensagens agora"
          >
            <svg
              className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmLimpeza(true)}
            className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
            title="Remover dados fictícios de demonstração"
          >
            <span>Limpar testes</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback Amigável */}
      {alerta && (
        <div className="bg-blue-50 border-x border-b border-blue-200 text-blue-900 px-4 py-2.5 text-xs flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{alerta}</span>
          </div>
          <button
            onClick={() => setAlerta(null)}
            className="text-blue-600 hover:text-blue-900 font-bold ml-2 p-1"
            aria-label="Fechar alerta"
          >
            ✕
          </button>
        </div>
      )}

      {/* Container Principal: Duas Colunas */}
      <div className="flex flex-1 flex-col md:flex-row bg-white rounded-b-xl border-x border-b border-slate-200 shadow-xs overflow-hidden">
        {/* Coluna Esquerda: Lista de Conversas */}
        <div
          className={`${
            selectedLead ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 bg-white flex-col h-full overflow-hidden`}
        >
          {/* Filtros da Lista */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 shrink-0 space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">
                Conversas ({filteredLeads.length})
              </h2>
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
                value={filterCanal}
                onChange={(e) => setFilterCanal(e.target.value)}
              >
                <option value="todos">Todos os canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                className="flex-1 bg-white border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="auto">Automático</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {/* Itens de Conversa */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredLeads.map((lead) => {
              const ultimaMsg = lead.mensagens[lead.mensagens.length - 1];
              const isSelected = selectedLeadId === lead.id;

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`p-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 border-l-4 border-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                      {lead.contato.nome}
                    </span>
                    <span className="text-[10px] font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                      {lead.canal === 'whatsapp' ? 'WhatsApp' : lead.canal}
                    </span>
                  </div>

                  {lead.empresa?.razao_social && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lead.empresa.nome_fantasia || lead.empresa.razao_social}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 truncate mt-1">
                    {ultimaMsg ? ultimaMsg.conteudo : 'Nenhuma mensagem gravada'}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      {lead.protocolo}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        lead.atendente_id
                          ? 'text-blue-700 bg-blue-100'
                          : 'text-emerald-700 bg-emerald-100'
                      }`}
                    >
                      {lead.atendente_id ? 'Manual' : 'Automático'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  {leadsList.length === 0
                    ? 'Nenhuma conversa ativa no momento'
                    : 'Nenhuma conversa com os filtros selecionados'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {leadsList.length === 0
                    ? 'As mensagens recebidas pelo WhatsApp da CET aparecerão aqui automaticamente.'
                    : 'Altere o filtro de canais ou status para ver mais conversas.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Janela de Chat */}
        <div
          className={`${
            selectedLead ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-slate-50/50 h-full overflow-hidden`}
        >
          {selectedLead ? (
            <>
              {/* Cabeçalho do Chat */}
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-2xs">
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                        {selectedLead.contato.nome}
                      </h3>
                      <Link
                        href={`/admin/leads/${selectedLead.id}`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        title="Ver ficha completa"
                      >
                        Ver ficha
                      </Link>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {selectedLead.empresa?.nome_fantasia || selectedLead.empresa?.razao_social || 'Empresa não identificada'} • {selectedLead.contato.telefone_e164}
                    </p>
                  </div>
                </div>

                {/* Ações no Cabeçalho do Chat */}
                <div className="shrink-0 flex items-center gap-2">
                  {/* Botão de Apagar Mensagens Desta Conversa */}
                  {selectedLead.mensagens.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmLimparHistorico(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-red-300 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition"
                      title="Apagar todas as mensagens desta conversa"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Apagar mensagens</span>
                    </button>
                  )}

                  {/* Controle de Atendimento (Manual vs Automático) */}
                  {selectedLead.atendente_id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await devolverParaRobo(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      Liberar para automático
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await assumirAtendimento(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
                    >
                      Assumir atendimento
                    </button>
                  )}
                </div>
              </div>

              {/* Área de Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {selectedLead.mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Nenhuma mensagem nesta conversa.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">O histórico de mensagens está limpo.</p>
                  </div>
                ) : (
                  selectedLead.mensagens.map((msg) => {
                    const isSaida = msg.direcao === 'saida';

                    return (
                      <div
                        key={msg.id}
                        className={`group flex flex-col ${isSaida ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 max-w-[88%] sm:max-w-[75%]">
                          {/* Botão de excluir mensagem individual (se for mensagem de saída) */}
                          {isSaida && (
                            <button
                              type="button"
                              onClick={() => setMensagemParaExcluir(msg.id)}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Apagar esta mensagem"
                              aria-label="Apagar mensagem"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}

                          {/* Balão da Mensagem */}
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isSaida
                                ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                          </div>

                          {/* Botão de excluir mensagem individual (se for mensagem de entrada) */}
                          {!isSaida && (
                            <button
                              type="button"
                              onClick={() => setMensagemParaExcluir(msg.id)}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Apagar esta mensagem"
                              aria-label="Apagar mensagem"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Metadados: horário e status */}
                        <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isSaida && (
                            <span className="text-slate-400">
                              • {msg.status}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Caixa de Digitação e Envio */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                {selectedLead.atendente_id ? (
                  <form onSubmit={handleEnviarMensagem} className="flex gap-2">
                    <input
                      type="text"
                      value={textoResposta}
                      onChange={(e) => setTextoResposta(e.target.value)}
                      placeholder="Digite a mensagem para enviar ao cliente..."
                      className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      disabled={enviando}
                      required
                    />
                    <button
                      type="submit"
                      disabled={enviando || !textoResposta.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-1.5"
                    >
                      {enviando ? (
                        <span>Enviando...</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Enviar</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 text-xs text-slate-600 bg-slate-100 rounded-lg">
                    <span>O atendimento automático está ativo nesta conversa.</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await assumirAtendimento(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0"
                    >
                      Assumir para responder
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Atendimento ao Cliente
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Selecione uma conversa na lista à esquerda para visualizar as mensagens ou responder ao cliente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação: Apagar Mensagem Individual */}
      {mensagemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Apagar Mensagem?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              Tem certeza que deseja apagar esta mensagem do histórico do sistema?
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMensagemParaExcluir(null)}
                disabled={excluindoMensagem}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluirMensagem}
                disabled={excluindoMensagem}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
              >
                {excluindoMensagem ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Apagar Todas as Mensagens Desta Conversa */}
      {showConfirmLimparHistorico && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Apagar Mensagens Desta Conversa?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mb-3 leading-relaxed">
              Você está prestes a apagar <strong>todas as {selectedLead.mensagens.length} mensagens</strong> trocadas com{' '}
              <strong>{selectedLead.contato.nome}</strong>.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-5">
              Os dados de cadastro do cliente e empresa continuarão salvos. Apenas o histórico de mensagens deste chat será apagado.
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLimparHistorico(false)}
                disabled={limpandoHistorico}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLimparHistorico}
                disabled={limpandoHistorico}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
              >
                {limpandoHistorico ? 'Apagando...' : 'Sim, Apagar Histórico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Limpar Dados de Teste Demo */}
      {showConfirmLimpeza && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Limpar Dados de Teste
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-3 leading-relaxed">
              Esta ação removerá todos os registros fictícios criados para testes.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 mb-5">
              Seus acessos e configurações permanecem intactos. O sistema ficará pronto para uso real.
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLimpeza(false)}
                disabled={limpandoDemo}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLimparDemo}
                disabled={limpandoDemo}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
              >
                {limpandoDemo ? 'Limpando...' : 'Sim, Limpar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
