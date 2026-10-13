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
  usuarioLogadoId,
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
    if (filterStatus === 'robo' && lead.atendente_id) return false;
    if (filterStatus === 'humano' && !lead.atendente_id) return false;
    return true;
  });

  // Envio de mensagem em tempo real
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
      // Re-sincroniza imediatamente para pegar o status definitivo
      await sincronizarConversas(true);
    } catch {
      setAlerta('Falha de conexão ao despachar mensagem.');
    } finally {
      setEnviando(false);
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
        setAlerta('✨ Sucesso: Dados fictícios de demonstração removidos! O painel está 100% limpo em modo real.');
        setTimeout(() => setAlerta(null), 7000);
      }
    } catch (err: any) {
      setAlerta(err.message || 'Erro ao limpar dados.');
    } finally {
      setLimpandoDemo(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[560px] max-h-[900px] w-full">
      {/* Barra de Status e Sincronização em Tempo Real */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-t-xl text-xs shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 tracking-wide">
            Modo 100% Real • Sincronizado ao Vivo com WhatsApp
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            (Última atualização: {lastSync.toLocaleTimeString('pt-BR')})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sincronizarConversas(false)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md text-[11px] font-medium transition disabled:opacity-50"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmLimpeza(true)}
            className="flex items-center gap-1 bg-red-950/80 hover:bg-red-900 border border-red-700/50 text-red-200 px-2.5 py-1 rounded-md text-[11px] font-medium transition"
            title="Remove leads e conversas fake do seed demo"
          >
            🧹 Limpar Dados Demo
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {alerta && (
        <div className="bg-blue-50 border-x border-b border-blue-200 text-blue-900 px-4 py-2 text-xs flex justify-between items-center shrink-0">
          <span>{alerta}</span>
          <button
            onClick={() => setAlerta(null)}
            className="text-blue-600 hover:text-blue-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Container Principal */}
      <div className="flex flex-1 flex-col md:flex-row bg-white rounded-b-xl border-x border-b border-slate-200 shadow-xs overflow-hidden">
        {/* Sidebar - Lista de Conversas */}
        <div
          className={`${
            selectedLead ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-200 bg-white flex-col h-full overflow-hidden`}
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Conversas Ativas ({filteredLeads.length})
              </h2>
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
                value={filterCanal}
                onChange={(e) => setFilterCanal(e.target.value)}
              >
                <option value="todos">Todos os canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
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
            {filteredLeads.map((lead) => {
              const ultimaMsg = lead.mensagens[lead.mensagens.length - 1];
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`p-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedLeadId === lead.id
                      ? 'bg-blue-50/80 border-l-4 border-blue-600'
                      : ''
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
                    {ultimaMsg ? ultimaMsg.conteudo : 'Sem mensagens'}
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
                      {lead.atendente_id ? 'Humano' : 'Robô'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <span className="text-4xl mb-3">📱</span>
                <p className="font-semibold text-slate-800 text-sm">
                  {leadsList.length === 0
                    ? 'Nenhuma conversa no momento'
                    : 'Nenhuma conversa com os filtros atuais'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {leadsList.length === 0
                    ? 'O sistema está conectado ao WhatsApp da CET. Quando um cliente enviar uma mensagem, ela aparecerá aqui em tempo real.'
                    : 'Ajuste os filtros acima para visualizar as mensagens.'}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Link
                    href="/admin/whatsapp"
                    className="inline-flex items-center justify-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    Ver WhatsApp
                  </Link>
                  <Link
                    href="/admin/atendimento"
                    onClick={() => sincronizarConversas(false)}
                    className="inline-flex items-center justify-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    Recarregar
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Janela de Chat */}
        <div
          className={`${
            selectedLead ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-slate-50 h-full overflow-hidden`}
        >
          {selectedLead ? (
            <>
              {/* Cabeçalho do Chat */}
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
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate flex items-center gap-2">
                      {selectedLead.contato.nome}
                      {selectedLead.empresa?.razao_social && (
                        <span className="text-xs font-normal text-slate-500 truncate">
                          ({selectedLead.empresa.razao_social})
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {selectedLead.contato.telefone_e164} • {selectedLead.protocolo}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {selectedLead.atendente_id ? (
                    <button
                      onClick={async () => {
                        await devolverParaRobo(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      Devolver ao Robô
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await assumirAtendimento(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      Assumir Atendimento
                    </button>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedLead.mensagens.map((msg) => {
                  const isSaida = msg.direcao === 'saida';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSaida ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm ${
                          isSaida
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                        {new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {isSaida && (
                          <span className="text-slate-400 font-mono">
                            • {msg.status}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                {selectedLead.atendente_id ? (
                  <form onSubmit={handleEnviarMensagem} className="flex gap-2">
                    <input
                      type="text"
                      value={textoResposta}
                      onChange={(e) => setTextoResposta(e.target.value)}
                      placeholder="Digite sua resposta real para o WhatsApp do cliente..."
                      className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      disabled={enviando}
                      required
                    />
                    <button
                      type="submit"
                      disabled={enviando || !textoResposta.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-1.5"
                    >
                      {enviando ? (
                        <>
                          <span className="animate-spin text-xs">⏳</span> Enviando...
                        </>
                      ) : (
                        'Enviar'
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 text-xs text-slate-600 bg-slate-100 rounded-lg font-medium">
                    <span>O robô está conduzindo esta conversa automaticamente.</span>
                    <button
                      onClick={async () => {
                        await assumirAtendimento(selectedLead.id);
                        sincronizarConversas(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                      Assumir para Responder
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-sm font-semibold text-slate-700">
                Central de Atendimento ao Vivo
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Selecione uma conversa na lista à esquerda para acompanhar o diálogo do cliente com o robô ou assumir o atendimento humano.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação para Limpar Dados Demo */}
      {showConfirmLimpeza && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-slate-900">
                Ativar Modo 100% Real
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Você está prestes a <strong>remover todos os dados falsos/fictícios</strong> do seed demo (clientes de teste como <em>Dra. Fernanda</em>, <em>Hospital Araguaia</em>, etc.).
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 mb-5">
              ✅ <strong>Seus logins, senhas e configurações permanecem 100% intactos.</strong> O sistema ficará pronto e limpo para receber clientes reais do WhatsApp da CET.
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
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition flex items-center gap-1.5"
              >
                {limpandoDemo ? 'Limpando...' : 'Sim, Limpar e Deixar 100% Real'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
