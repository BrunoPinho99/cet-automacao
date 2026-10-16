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
      {/* 4. Banner de Alerta ("Instância desconectada.") */}
      {(mensagem || status !== 'open') && (
        <div className="flex items-center justify-between bg-soft-lavender/60 border border-blue-200/80 border-l-4 border-l-royal rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-royal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-slate-800">
              {mensagem || 'Instância desconectada.'}
            </span>
          </div>
          {mensagem && (
            <button
              onClick={() => setMensagem(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              title="Fechar alerta"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 5. Card Principal e Cabeçalho de Status */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-wrap gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            STATUS DO CANAL CORPORATIVO
          </span>
          <div>
            {status === 'open' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-medium text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Conectado e Operacional
              </span>
            )}
            {status === 'connecting' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-soft-lavender border border-blue-200 px-3.5 py-1 text-xs font-medium text-royal">
                <span className="w-2 h-2 rounded-full bg-azure animate-pulse" />
                Aguardando Leitura do QR Code
              </span>
            )}
            {(status === 'close' || status === 'disconnected') && (
              <span className="inline-flex items-center gap-2 rounded-full bg-soft-lavender border border-blue-200 px-3.5 py-1 text-xs font-medium text-royal">
                <span className="w-2 h-2 rounded-full bg-azure animate-pulse" />
                Aguardando Leitura do QR Code
              </span>
            )}
            {status === 'loading' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3.5 py-1 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                Verificando...
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1 text-xs font-medium text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Instância Inacessível
              </span>
            )}
          </div>
        </div>

        {/* Cenário 1: Conectado */}
        {status === 'open' && (
          <div className="p-8 bg-sky-50/40 border border-sky-200/80 rounded-xl text-center space-y-4">
            <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">WhatsApp Pareado com Sucesso</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                O número oficial está ativo para receber mensagens de clientes, realizar o fluxo de atendimento da CET e sincronizar com o painel em tempo real.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => executarAcao('logout')}
                disabled={loading}
                className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-medium rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                Desconectar WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Cenário 2: Aguardando QR Code */}
        {status !== 'open' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* 6. Coluna da Esquerda: Container do QR Code */}
            <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-6 flex flex-col items-center">
              {qrcode ? (
                <div className="w-full flex flex-col items-center">
                  {/* Moldura branca interna limpa */}
                  <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-2xs relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
                      alt="QR Code WhatsApp"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain brightness-90 contrast-125"
                    />
                    {/* Logo CET centralizada dentro de um pequeno quadrado branco */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-md bg-white p-1 shadow-2xs border border-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-cet.png" alt="CET" className="w-6 h-6 object-contain" />
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso fina de 2px com Azure Blue */}
                  <div className="w-full max-w-[280px] h-1 bg-slate-200 rounded-full overflow-hidden mt-4 mb-2">
                    <div className="h-full bg-azure rounded-full animate-pulse w-full" />
                  </div>

                  {/* Texto e ícone discreto de atualização */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>O código atualiza automaticamente a cada 20 segundos.</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="w-10 h-10 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">Gerando QR Code de pareamento...</p>
                  <button
                    onClick={() => executarAcao('restart')}
                    disabled={loading}
                    className="mt-2 px-3.5 py-2 bg-royal hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    Gerar Novo Código
                  </button>
                </div>
              )}
            </div>

            {/* 7. Coluna da Direita: Passo a Passo em Timeline Vertical (Stepper) */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-6">
                  Como conectar seu WhatsApp oficial
                </h3>

                <div className="relative">
                  {/* Linha vertical contínua de 1px passando pelo centro dos círculos (centro de w-7 é 14px) */}
                  <div
                    className="absolute left-[13.5px] top-3.5 bottom-3.5 w-px bg-slate-200"
                    aria-hidden="true"
                  />

                  <ol className="space-y-5">
                    <li className="relative flex items-start gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                        1
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">
                        Abra o aplicativo <strong className="font-semibold text-slate-900">WhatsApp</strong> no celular oficial da clínica CET.
                      </span>
                    </li>

                    <li className="relative flex items-start gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                        2
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">
                        Acesse <strong className="font-semibold text-slate-900">Configurações</strong> (no iPhone) ou toque nos <strong className="font-semibold text-slate-900">três pontinhos</strong> (no Android).
                      </span>
                    </li>

                    <li className="relative flex items-start gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                        3
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">
                        Selecione a opção <strong className="font-semibold text-slate-900">Aparelhos Conectados</strong>.
                      </span>
                    </li>

                    <li className="relative flex items-start gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                        4
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">
                        Toque no botão <strong className="font-semibold text-slate-900">Conectar um aparelho</strong>.
                      </span>
                    </li>

                    <li className="relative flex items-start gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                        5
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">
                        Aponte a câmera para o <strong className="font-semibold text-slate-900">QR Code</strong> exibido ao lado até a confirmação.
                      </span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* 8. Ação de Rodapé ("Reiniciar Instância") */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => executarAcao('restart')}
                  disabled={loading}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-medium text-xs px-4 py-2.5 rounded-lg shadow-2xs transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loading && (
                    <svg className="w-3.5 h-3.5 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>Reiniciar Instância</span>
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
