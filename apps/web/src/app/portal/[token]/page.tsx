'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { infoPorte } from '@/lib/porte';
import { CheckoutButton } from '@/app/ficha/[token]/pagamento/checkout-button';

export default function PortalClientePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const carregarPortal = async () => {
    try {
      const res = await fetch(`/api/portal?token=${token}`);
      if (!res.ok) {
        const body = await res.json();
        // Se a ficha não estiver concluída, mandar de volta pra ficha
        if (res.status === 403 && body.status !== 'concluida') {
          router.push(`/ficha/${token}`);
          return;
        }
        throw new Error(body.error || 'Erro ao carregar dados do portal.');
      }
      
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPortal();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800">Ops!</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreValor = data.score_sst?.total || 0;
  const isPago = Boolean(data.pago);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Portal do Cliente CET
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
              Diagnóstico Ocupacional
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Resultados para <span className="font-semibold text-slate-800">{data.empresa?.razao_social || 'Sua Empresa'}</span>
              {data.empresa?.cnpj && <span className="font-mono ml-2">({data.empresa.cnpj})</span>}
            </p>
          </div>

          <div>
            {isPago ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Diagnóstico Liberado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Aguardando Pagamento
              </span>
            )}
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Score SST com barra em gradiente */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Score SST de Conformidade
            </h2>
            <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
              {scoreValor}
              <span className="text-xl text-slate-400 font-medium">/100</span>
            </div>

            {/* Barra gradiente contínua */}
            <div className="w-full max-w-xs space-y-1">
              <div className="relative h-3 w-full rounded-full overflow-hidden bg-slate-200">
                <div
                  className="h-full w-full"
                  style={{
                    background: 'linear-gradient(to right, #ef4444 0%, #f97316 35%, #eab308 70%, #22c55e 100%)',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-white border-2 border-slate-900 rounded-full shadow"
                  style={{ left: `${scoreValor}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span className="text-red-500 font-semibold">Crítico</span>
                <span className="text-orange-500 font-semibold">Alerta</span>
                <span className="text-amber-500 font-semibold">Moderado</span>
                <span className="text-emerald-500 font-semibold">Conforme</span>
              </div>
            </div>

            <div className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              Classificação: {data.score_sst?.classificacao || (scoreValor < 35 ? 'Crítico' : 'Alerta')}
            </div>
          </div>

          {/* Porte da Empresa */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Porte e Roteiro de Atendimento
            </h2>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {infoPorte(data.rota?.rota).nome}
            </div>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {infoPorte(data.rota?.rota).descricao}
            </p>
          </div>
        </div>

        {/* ÁREA DO RELATÓRIO — LIBERADO APENAS APÓS PAGAMENTO */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Relatório Executivo Detalhado
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Diagnóstico técnico com todas as Normas Regulamentadoras aplicáveis, plano de ação e prevenção de multas.
            </p>
          </div>

          {/* BLOQUEADO SE NÃO ESTIVER PAGO */}
          {!isPago ? (
            <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-6 sm:p-8 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
                🔒
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full">
                  Liberação Mediante Pagamento
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                  Diagnóstico Completo Pendente de Pagamento
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  A avaliação técnica da sua empresa foi calculada. A visualização detalhada de todas as não-conformidades e o download do PDF oficial em folha timbrada da CET são liberados após a confirmação do pagamento de <strong>R$ 19,90</strong>.
                </p>
              </div>

              {/* CHECKOUT TRANSPARENTE EMBUTIDO NO PORTAL */}
              {data.ficha_id && (
                <div className="pt-4 max-w-lg mx-auto text-left bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-md">
                  <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Pagamento Seguro Asaas
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">Concluir Pagamento e Liberar Laudo</h4>
                    </div>
                    <span className="text-base font-extrabold text-emerald-700">R$ 19,90</span>
                  </div>

                  <CheckoutButton
                    fichaId={data.ficha_id}
                    token={token}
                    onSucesso={() => carregarPortal()}
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => carregarPortal()}
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 hover:bg-white text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
                >
                  <span>🔄 Já realizei o pagamento (Verificar no Asaas)</span>
                </button>
              </div>
            </div>
          ) : (
            /* LIBERADO SE PAGO */
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      diagnostico_sst_completo.pdf
                    </h3>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      ✓ Pago e Liberado para download
                    </p>
                  </div>
                </div>

                <a 
                  href={`/api/relatorios/${data.relatorio?.id || data.ficha_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md text-center inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  <span>Baixar PDF</span>
                </a>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
