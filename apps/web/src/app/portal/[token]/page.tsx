'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  // Polling para quando o relatório estiver gerando
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

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

        // Se o relatório ainda não estiver pronto, ativar polling a cada 3 segundos
        if (!json.relatorio) {
          if (!intervalId) {
            intervalId = setInterval(carregarPortal, 3000);
          }
        } else {
          // Relatório pronto, parar polling
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    carregarPortal();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-red-50 p-6 rounded-lg text-red-700 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Ops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Portal do Cliente</h1>
            <p className="text-slate-500 mt-1">
              Resultados do diagnóstico para <span className="font-semibold text-slate-700">{data.empresa.razao_social}</span>
            </p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
            Diagnóstico Concluído
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Score SST */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-medium text-slate-500 uppercase tracking-wider mb-2">Score SST</h2>
            <div className="text-6xl font-black text-slate-900 mb-4">
              {data.score_sst?.total || 0}
              <span className="text-2xl text-slate-400 font-medium">/100</span>
            </div>
            <div className="inline-block px-4 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
              Classificação: {data.score_sst?.classificacao || 'N/A'}
            </div>
          </div>

          {/* Rota */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-medium text-slate-500 uppercase tracking-wider mb-2">Rota Recomendada</h2>
            <div className="text-4xl font-black text-blue-600 mb-4">
              Rota {data.rota?.rota || '-'}
            </div>
            {data.rota?.gatilho_critico && (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                ⚠️ Identificado gatilho crítico de urgência
              </p>
            )}
            {!data.rota?.gatilho_critico && (
              <p className="text-sm text-slate-500 px-3 py-2">
                Baseado no porte e complexidade da operação
              </p>
            )}
          </div>
        </div>

        {/* Área do Relatório */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Seu Relatório Detalhado</h2>
          <p className="text-slate-600 mb-6">
            Nossa inteligência artificial gerou um relatório completo com todas as inconformidades e recomendações legais aplicáveis à sua empresa.
          </p>

          {data.relatorio ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">diagnostico_sst_completo.pdf</h3>
                  <p className="text-sm text-slate-500">Pronto para download</p>
                </div>
              </div>
              <a 
                href={`/api/relatorios/${data.relatorio.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors focus:ring-4 focus:ring-slate-200"
              >
                Baixar PDF
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
              <p className="text-slate-600 font-medium animate-pulse">Gerando seu relatório, aguarde um instante...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
