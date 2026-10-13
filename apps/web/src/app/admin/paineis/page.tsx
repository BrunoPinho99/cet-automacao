import { prisma } from '@cet/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, Users, Briefcase, ShieldAlert, LineChart } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { podeAcessarRota } from '@/lib/rbac';
import { infoPorte } from '@/lib/porte';

export const revalidate = 60; // Cache for 60 seconds

export default async function PaineisPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!podeAcessarRota('/admin/paineis', session.role)) {
    redirect('/admin/forbidden');
  }

  // 1. Captação
  const leadsPorCanal = await prisma.lead.groupBy({
    by: ['canal'],
    _count: { id: true },
  });

  // 2. Diagnóstico
  const fichasPorStatus = await prisma.ficha.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // 3. Comercial
  const rotas = await prisma.rota.groupBy({
    by: ['rota_completa'],
    _count: { id: true },
  });

  const somaValores = await prisma.negocio.aggregate({
    _sum: { valor_estimado: true },
  });

  // 4. SST
  const scoresSST = await prisma.scoreSST.groupBy({
    by: ['classificacao'],
    _count: { id: true },
  });

  // Process data for charts
  const leadData = leadsPorCanal.map((l) => ({ name: l.canal === 'whatsapp' ? 'WhatsApp' : l.canal, value: l._count.id }));
  const fichaData = fichasPorStatus.map((f) => ({ name: f.status, value: f._count.id }));
  const rotaData = rotas.map((r) => ({ name: infoPorte(r.rota_completa).nome, value: r._count.id }));
  const sstData = scoresSST.map((s) => ({ name: s.classificacao, value: s._count.id }));

  const totalValor = somaValores._sum.valor_estimado
    ? (somaValores._sum.valor_estimado / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

  // Helper for Horizontal Bar Chart (Modern SaaS 2026, Tailwind based)
  const renderBar = (label: string, value: number, max: number, colorClass: string) => {
    const percentage = max === 0 ? 0 : Math.round((value / max) * 100);
    return (
      <div key={label} className="mb-4 last:mb-0">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-slate-500 font-mono tabular-nums font-semibold">{value}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const getMax = (arr: { value: number }[]) => Math.max(...arr.map((a) => a.value), 1);

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Painéis Gerenciais
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Visão consolidada da operação: captação, diagnóstico técnico e pipeline comercial da CET.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Painel de Captação */}
        <Card className="col-span-1 border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3.5 pt-4">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Captação por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {leadData.length > 0 ? (
              leadData.map((d) => renderBar(d.name, d.value, getMax(leadData), 'bg-blue-600'))
            ) : (
              <p className="text-slate-400 text-xs">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Painel de Diagnóstico */}
        <Card className="col-span-1 border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3.5 pt-4">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Diagnóstico (Fichas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {fichaData.length > 0 ? (
              fichaData.map((d) => renderBar(d.name, d.value, getMax(fichaData), 'bg-emerald-600'))
            ) : (
              <p className="text-slate-400 text-xs">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Painel Comercial */}
        <Card className="col-span-1 border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3.5 pt-4">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Pipeline Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="mb-5 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Valor Total em Negociação</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{totalValor}</p>
            </div>
            <h4 className="text-xs font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-1.5">
              Porte das Empresas
            </h4>
            {rotaData.length > 0 ? (
              rotaData.map((d) => renderBar(d.name, d.value, getMax(rotaData), 'bg-blue-600'))
            ) : (
              <p className="text-slate-400 text-xs">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Painel SST */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3.5 pt-4">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              SST — Riscos e Conformidade Ocupacional
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-1.5">
                Distribuição de Classificação de Risco
              </h4>
              {sstData.length > 0 ? (
                sstData.map((d) =>
                  renderBar(
                    d.name,
                    d.value,
                    getMax(sstData),
                    d.name === 'critico'
                      ? 'bg-rose-500'
                      : d.name === 'alto_risco'
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  )
                )
              ) : (
                <p className="text-slate-400 text-xs">Sem dados no período</p>
              )}
            </div>
            <div className="flex items-center justify-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-6">
              <div className="text-center">
                <LineChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Indicador de Tendência Histórica</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Métricas de conformidade contínua com atualização automática.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
