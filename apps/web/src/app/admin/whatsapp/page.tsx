'use client';

import React, { useState, useEffect } from 'react';

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<'loading' | 'open' | 'connecting' | 'disconnected' | 'error'>('loading');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho SaaS 2026 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Conexão WhatsApp CET
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pareamento do número corporativo para atendimento de clientes e triagem em tempo real.
          </p>
        </div>

        <button
          onClick={carregarStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition shadow-2xs disabled:opacity-50"
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

      {mensagem && (
        <div className="p-4 bg-blue-50 border border-blue-200/80 text-blue-900 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>{mensagem}</span>
          <button onClick={() => setMensagem(null)} className="text-blue-500 hover:text-blue-800 text-xs">✕</button>
        </div>
      )}

      {/* Cartão de Status do Serviço */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status do Canal</span>
          <div>
            {status === 'open' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Conectado e Operacional
              </span>
            )}
            {status === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Aguardando Leitura do QR Code
              </span>
            )}
            {(status === 'close' || status === 'disconnected') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Desconectado
              </span>
            )}
            {status === 'loading' && (
              <span className="text-xs text-slate-400">Verificando status do canal...</span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                Instância Inacessível
              </span>
            )}
          </div>
        </div>

        {/* Cenário 1: Conectado */}
        {status === 'open' && (
          <div className="p-6 bg-emerald-50/50 border border-emerald-200/70 rounded-xl text-center space-y-3.5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">WhatsApp Pareado com Sucesso</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              O número oficial está ativo para receber mensagens de clientes, realizar o fluxo de atendimento da CET e sincronizar com o painel em tempo real.
            </p>

            <div className="pt-3">
              <button
                onClick={() => executarAcao('logout')}
                disabled={loading}
                className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition"
              >
                Desconectar WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Cenário 2: Aguardando QR Code */}
        {status !== 'open' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/70 border border-slate-200 rounded-xl">
              {qrcode ? (
                <div className="space-y-3 text-center">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrcode}
                      alt="QR Code WhatsApp"
                      className="w-60 h-60 object-contain mx-auto"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">O código atualiza automaticamente a cada 20 segundos.</p>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">Gerando QR Code de pareamento...</p>
                  <button
                    onClick={() => executarAcao('restart')}
                    disabled={loading}
                    className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                  >
                    Gerar Novo Código
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Instruções de pareamento:</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-600">
                <li className="leading-relaxed">
                  Abra o aplicativo <strong>WhatsApp</strong> no celular oficial.
                </li>
                <li className="leading-relaxed">
                  Acesse <strong>Configurações</strong> ou o menu superior.
                </li>
                <li className="leading-relaxed">
                  Toque em <strong>Aparelhos Conectados</strong>.
                </li>
                <li className="leading-relaxed">
                  Toque em <strong>Conectar um aparelho</strong>.
                </li>
                <li className="leading-relaxed">
                  Aponte a câmera para o <strong>QR Code</strong> exibido ao lado.
                </li>
              </ol>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => executarAcao('restart')}
                  disabled={loading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Reiniciar Instância
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
