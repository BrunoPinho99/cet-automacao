'use client';

import React, { useState, useEffect } from 'react';

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<'loading' | 'open' | 'connecting' | 'disconnected' | 'close' | 'error'>('loading');
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregarStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp');
      const data = await res.json();

      if (data.success) {
        setStatus(data.state);
        setQrcode(data.qrcode);
      } else {
        setStatus('error');
        setMensagem(data.error || 'Erro ao carregar status');
      }
    } catch {
      setStatus('error');
      setMensagem('Falha de conexão com a API de WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStatus();
    // Auto-refresh a cada 10 segundos caso esteja aguardando leitura
    const interval = setInterval(() => {
      carregarStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const executarAcao = async (action: 'restart' | 'logout') => {
    setLoading(true);
    setMensagem(null);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setMensagem(action === 'restart' ? 'Instância reiniciada com sucesso.' : 'Instância desconectada.');
        setTimeout(carregarStatus, 2000);
      } else {
        setMensagem(data.error || 'Erro ao executar ação');
      }
    } catch {
      setMensagem('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho SaaS 2026 Totalmente Responsivo */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/70 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Conexão WhatsApp CET
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pareamento do número corporativo para atendimento de clientes e triagem em tempo real.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={carregarStatus}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-2xs disabled:opacity-50"
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

      {mensagem && (
        <div className="p-4 bg-blue-50 border border-blue-200/80 text-blue-900 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>{mensagem}</span>
          <button onClick={() => setMensagem(null)} className="text-blue-500 hover:text-blue-800 text-xs font-bold p-1">✕</button>
        </div>
      )}

      {/* Cartão de Status do Serviço */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-wrap gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status do Canal Corporativo</span>
          <div>
            {status === 'open' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Conectado e Operacional
              </span>
            )}
            {status === 'connecting' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Aguardando Leitura do QR Code
              </span>
            )}
            {(status === 'close' || status === 'disconnected') && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Desconectado
              </span>
            )}
            {status === 'loading' && (
              <span className="text-xs text-slate-400">Verificando status do canal...</span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                Instância Inacessível
              </span>
            )}
          </div>
        </div>

        {/* Cenário 1: Conectado */}
        {status === 'open' && (
          <div className="p-8 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">WhatsApp Pareado com Sucesso</h3>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              O número oficial está ativo para receber mensagens de clientes, realizar o fluxo de atendimento da CET e sincronizar com o painel em tempo real.
            </p>

            <div className="pt-2">
              <button
                onClick={() => executarAcao('logout')}
                disabled={loading}
                className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs sm:text-sm font-semibold rounded-xl transition shadow-2xs"
              >
                Desconectar WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Cenário 2: Aguardando QR Code — Grid Totalmente Responsivo */}
        {status !== 'open' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* Bloco do QR Code (5 colunas em desktop, full em mobile) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/70 border border-slate-200 rounded-2xl">
              {qrcode ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrcode}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">O código atualiza automaticamente a cada 20 segundos.</p>
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-slate-700 font-medium">Gerando QR Code de pareamento...</p>
                  <button
                    onClick={() => executarAcao('restart')}
                    disabled={loading}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-xs"
                  >
                    Gerar Novo Código
                  </button>
                </div>
              )}
            </div>

            {/* Bloco de Instruções (7 colunas em desktop, full em mobile) */}
            <div className="lg:col-span-7 space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">✓</span>
                  Como conectar seu WhatsApp oficial:
                </h3>
                <ol className="space-y-3 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span className="leading-relaxed">Abra o aplicativo <strong>WhatsApp</strong> no celular oficial da clínica CET.</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span className="leading-relaxed">Acesse <strong>Configurações</strong> (no iPhone) ou toque nos <strong>três pontinhos</strong> (no Android).</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="leading-relaxed">Selecione a opção <strong>Aparelhos Conectados</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span className="leading-relaxed">Toque no botão <strong>Conectar um aparelho</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                    <span className="leading-relaxed">Aponte a câmera para o <strong>QR Code</strong> exibido ao lado até a confirmação.</span>
                  </li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => executarAcao('restart')}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition"
                >
                  Reiniciar Instância
                </button>
                <span className="text-xs text-slate-400">Use caso a imagem não carregue ou expire.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
