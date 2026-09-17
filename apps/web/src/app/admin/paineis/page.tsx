import { prisma } from '@cet/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, Users, Briefcase, ShieldAlert, LineChart } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { podeAcessarRota } from '@/lib/rbac';

export const revalidate = 60; // Cache for 60 seconds

export default async function PaineisPage() {
  const token = cookies().get('cet_admin_session')?.value;
  if (!token) redirect('/login');
  
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) redirect('/login');

  if (!podeAcessarRota('/admin/paineis', payload.role)) {
    redirect('/admin/forbidden');
  }

  // 1. Captação
  const leadsPorCanal = await prisma.lead.groupBy({
    by: ['canal'],
    _count: { id: true }
  });

  // 2. Diagnóstico
  const fichasPorStatus = await prisma.ficha.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  // 3. Comercial
  const rotas = await prisma.rota.groupBy({
    by: ['rota_completa'],
    _count: { id: true }
  });

  const somaValores = await prisma.negocio.aggregate({
    _sum: { valor_estimado: true }
  });

  // 4. SST
  const scoresSST = await prisma.scoreSST.groupBy({
    by: ['classificacao'],
    _count: { id: true }
  });

  // Process data for charts
  const leadData = leadsPorCanal.map(l => ({ name: l.canal, value: l._count.id }));
  const fichaData = fichasPorStatus.map(f => ({ name: f.status, value: f._count.id }));
  const rotaData = rotas.map(r => ({ name: r.rota_completa, value: r._count.id }));
  const sstData = scoresSST.map(s => ({ name: s.classificacao, value: s._count.id }));

  const totalValor = somaValores._sum.valor_estimado ? (somaValores._sum.valor_estimado / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

  // Helper for Horizontal Bar Chart (Tailwind based, no libraries)
  const renderBar = (label: string, value: number, max: number, colorClass: string) => {
    const percentage = max === 0 ? 0 : Math.round((value / max) * 100);
    return (
      <div key={label} className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-500">{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  const getMax = (arr: { value: number }[]) => Math.max(...arr.map(a => a.value), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        Painéis Gerenciais
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Painel de Captação */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Captação (Leads)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {leadData.length > 0 ? leadData.map(d => renderBar(d.name, d.value, getMax(leadData), 'bg-indigo-500')) : <p className="text-gray-500 text-sm">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Painel de Diagnóstico */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Diagnóstico (Fichas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {fichaData.length > 0 ? fichaData.map(d => renderBar(d.name, d.value, getMax(fichaData), 'bg-emerald-500')) : <p className="text-gray-500 text-sm">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Painel Comercial */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6">
              <p className="text-sm text-gray-500 font-medium">Pipeline (Estimado)</p>
              <p className="text-2xl font-bold text-gray-900">{totalValor}</p>
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Rotas Definidas</h4>
            {rotaData.length > 0 ? rotaData.map(d => renderBar(d.name, d.value, getMax(rotaData), 'bg-amber-500')) : <p className="text-gray-500 text-sm">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Painel SST */}
        <Card className="col-span-1 md:col-span-2 shadow-sm">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              SST (Riscos e Conformidade)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Distribuição de Classificação</h4>
              {sstData.length > 0 ? sstData.map(d => renderBar(d.name, d.value, getMax(sstData), d.name === 'critico' ? 'bg-rose-600' : d.name === 'alto_risco' ? 'bg-orange-500' : d.name === 'atencao' ? 'bg-amber-400' : 'bg-emerald-500')) : <p className="text-gray-500 text-sm">Sem dados</p>}
            </div>
            <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="text-center p-6">
                <LineChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Gráfico de linha de tendência temporal de adequação será implementado na v2.</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
