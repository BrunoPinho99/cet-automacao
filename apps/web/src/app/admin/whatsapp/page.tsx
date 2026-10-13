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
      setMensagem('Falha de conexão com a Evolution API');
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
        setMensagem(action === 'restart' ? 'Instância reiniciada!' : 'Instância desconectada.');
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
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📱</span> Conexão do WhatsApp (Assistente CET)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pareie o número do WhatsApp da clínica com a Evolution API para ativar a triagem automática.
          </p>
        </div>

        <button
          onClick={carregarStatus}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <span>🔄</span> {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {mensagem && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm font-medium">
          {mensagem}
        </div>
      )}

      {/* Cartão de Status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Status da Conexão</span>
          <div>
            {status === 'open' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Conectado e Operacional
              </span>
            )}
            {status === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Aguardando Leitura do QR Code
              </span>
            )}
            {(status === 'close' || status === 'disconnected') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Desconectado
              </span>
            )}
            {status === 'loading' && (
              <span className="text-xs text-slate-400">Verificando status...</span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                Erro de Comunicação
              </span>
            )}
          </div>
        </div>

        {/* Cenário 1: Conectado */}
        {status === 'open' && (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
              ✓
            </div>
            <h3 className="text-lg font-bold text-emerald-900">WhatsApp Pareado com Sucesso!</h3>
            <p className="text-sm text-emerald-700 max-w-md mx-auto">
              Sua assistente digital está pronta para responder contatos, realizar a triagem inicial com regras da LGPD e direcionar para a Ficha Inteligente.
            </p>

            <div className="pt-4">
              <button
                onClick={() => executarAcao('logout')}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Desconectar WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Cenário 2: Aguardando QR Code */}
        {status !== 'open' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
              {qrcode ? (
                <div className="space-y-3 text-center">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200 inline-block">
                    <img
                      src={qrcode}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 object-contain mx-auto"
                    />
                  </div>
                  <p className="text-xs text-slate-500">O código atualiza automaticamente a cada 20 segundos.</p>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="animate-spin text-3xl">⏳</div>
                  <p className="text-sm text-slate-600 font-medium">Gerando QR Code na Evolution API...</p>
                  <button
                    onClick={() => executarAcao('restart')}
                    disabled={loading}
                    className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Gerar Novo Código
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">Como conectar seu WhatsApp:</h3>
              <ol className="list-decimal list-inside space-y-2.5 text-sm text-slate-600">
                <li className="leading-relaxed">
                  Abra o aplicativo <strong>WhatsApp</strong> no telefone da clínica.
                </li>
                <li className="leading-relaxed">
                  Toque em <strong>Configurações</strong> (iOS) ou nos <strong>três pontinhos</strong> (Android).
                </li>
                <li className="leading-relaxed">
                  Selecione <strong>Aparelhos Conectados</strong>.
                </li>
                <li className="leading-relaxed">
                  Toque no botão <strong>Conectar um aparelho</strong>.
                </li>
                <li className="leading-relaxed">
                  Aponte a câmera do celular para o <strong>QR Code</strong> ao lado.
                </li>
              </ol>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => executarAcao('restart')}
                  disabled={loading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
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
