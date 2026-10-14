import { prisma } from '@cet/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Actions } from './actions-client';
import { infoPorte } from '@/lib/porte';

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      empresa: true,
      contato: true,
      pedidos: {
        orderBy: { criado_em: 'desc' },
        take: 1,
      },
      fichas: {
        orderBy: { criado_em: 'desc' },
        take: 1,
        include: {
          score_sst: true,
          score_comercial: true,
          rota: true,
        },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const empresa = lead.empresa;
  const contato = lead.contato;
  const pedido = lead.pedidos[0];
  const ficha = lead.fichas[0];
  const scoreSst = ficha?.score_sst;
  const respostas = ficha?.respostas ? (ficha.respostas as Record<string, string>) : {};

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para Clientes
        </Link>
        <span className="font-mono text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
          Protocolo: {lead.protocolo}
        </span>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold leading-6 text-slate-900">
              {empresa?.nome_fantasia || empresa?.razao_social || 'Lead sem Nome'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Canal: <span className="font-semibold uppercase">{lead.canal}</span> | Criado em:{' '}
              {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {ficha && (
              <Link
                href={`/api/relatorios/${ficha.id}?format=html`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Visualizar Relatório SST
              </Link>
            )}
            <Actions
              leadId={lead.id}
              empresaId={empresa?.id || ''}
              pedidoId={pedido?.id}
              leadData={{
                razao_social: empresa?.razao_social || '',
                nome_fantasia: empresa?.nome_fantasia || '',
                cnpj: empresa?.cnpj || '',
                cidade: empresa?.cidade || '',
                uf: empresa?.uf || '',
                trabalhadores_proprios: empresa?.trabalhadores_proprios || 0,
                trabalhadores_terceiros: empresa?.trabalhadores_terceiros || 0,
                grau_risco: empresa?.grau_risco || 1,
                rota: ficha?.rota?.rota || 'A',
                status_pagamento: pedido?.status || 'pendente',
              }}
            />
          </div>
        </div>

        <div className="border-t border-slate-100">
          <dl className="divide-y divide-slate-100">
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Razão Social</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 sm:col-span-2 sm:mt-0">
                {empresa?.razao_social || '-'}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">CNPJ</dt>
              <dd className="mt-1 text-sm font-mono text-slate-800 sm:col-span-2 sm:mt-0">
                {empresa?.cnpj
                  ? empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
                  : '-'}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Contato Principal</dt>
              <dd className="mt-1 text-sm text-slate-800 sm:col-span-2 sm:mt-0">
                <span className="font-semibold">{contato?.nome || '-'}</span>
                {contato?.telefone_e164 && (
                  <span className="ml-3 font-mono text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {contato.telefone_e164}
                  </span>
                )}
                {contato?.email && (
                  <span className="ml-3 text-xs text-slate-500">({contato.email})</span>
                )}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Localização & Porte</dt>
              <dd className="mt-1 text-sm text-slate-800 sm:col-span-2 sm:mt-0">
                {empresa?.cidade || '-'}/{empresa?.uf || '-'} — {empresa?.trabalhadores_proprios ?? 0} próprios,{' '}
                {empresa?.trabalhadores_terceiros ?? 0} terceiros (Grau de Risco {empresa?.grau_risco || 1})
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Porte da Empresa</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                {(() => {
                  const p = infoPorte(ficha?.rota?.rota);
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        ficha?.rota?.rota === 'A'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : ficha?.rota?.rota === 'B'
                          ? 'bg-slate-100 text-slate-800 border border-slate-200'
                          : ficha?.rota?.rota === 'C'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.nome} — {p.descricao} ({p.prazo})
                    </span>
                  );
                })()}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Status de Pagamento</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                    pedido?.status?.toLowerCase() === 'pago' || pedido?.status?.toLowerCase() === 'confirmado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pedido?.status || 'Pendente'}
                </span>
                {pedido?.valor_centavos && (
                  <span className="ml-3 text-xs font-semibold text-slate-600">
                    R$ {(pedido.valor_centavos / 100).toFixed(2).replace('.', ',')}
                  </span>
                )}
              </dd>
            </div>
            {scoreSst && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-slate-500">Score SST</dt>
                <dd className="mt-1 text-sm text-slate-800 sm:col-span-2 sm:mt-0">
                  <span className="font-bold text-slate-900 text-base">{scoreSst.total}</span> / 100 ({scoreSst.classificacao})
                </dd>
              </div>
            )}
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">Respostas do Diagnóstico</dt>
              <dd className="mt-1 text-sm text-slate-700 sm:col-span-2 sm:mt-0">
                <ul role="list" className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {Object.entries(respostas).map(([pergunta, resposta]) => (
                    <li key={pergunta} className="flex items-center justify-between py-2.5 px-4 text-xs">
                      <span className="font-medium text-slate-700">{pergunta}</span>
                      <span className="text-slate-500 font-mono">{String(resposta)}</span>
                    </li>
                  ))}
                  {Object.keys(respostas).length === 0 && (
                    <li className="py-3 px-4 text-xs text-slate-400">Nenhuma resposta registrada.</li>
                  )}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
