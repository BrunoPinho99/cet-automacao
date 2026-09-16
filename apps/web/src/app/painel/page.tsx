'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

type SaudeResponse = {
  filas?: {
    relatorios: any;
    ploomes: any;
  };
  outbox?: {
    dead_events: number;
    pending_events: number;
  };
  sla?: {
    tempo_medio_processamento_ms: number;
  };
  error?: string;
};

export default function PainelSaudePage() {
  const [data, setData] = useState<SaudeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDados = async () => {
    try {
      const res = await fetch('/api/saude', {
        headers: { 'role': 'gestor' } // Simulação de RBAC
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dados');
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
    const interval = setInterval(fetchDados, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <div className="p-10 flex justify-center text-xl text-neutral-500">Carregando painel de saúde...</div>;
  }

  if (error) {
    return (
      <div className="p-10 text-red-500 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Acesso Negado ou Erro</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-10 bg-neutral-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Activity className="w-8 h-8 text-blue-600" />
        Painel de Saúde e Filas
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Médio (Outbox)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.sla?.tempo_medio_processamento_ms} ms</div>
            <p className="text-xs text-muted-foreground">Tempo da criação ao processamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fila Morta (Dead Events)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data?.outbox?.dead_events && data.outbox.dead_events > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.outbox?.dead_events || 0}</div>
            <p className="text-xs text-muted-foreground">Eventos falhos aguardando reprocessamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fila de Relatórios</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.filas?.relatorios?.waiting || 0} na fila</div>
            <p className="text-xs text-muted-foreground">
              {data?.filas?.relatorios?.active || 0} processando, {data?.filas?.relatorios?.completed || 0} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fila Ploomes</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.filas?.ploomes?.waiting || 0} na fila</div>
            <p className="text-xs text-muted-foreground">
              {data?.filas?.ploomes?.active || 0} processando, {data?.filas?.ploomes?.completed || 0} concluídos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
