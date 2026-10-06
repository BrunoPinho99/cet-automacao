import { prisma } from '@cet/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Actions } from './actions-client';

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      empresa: true,
      pedidos: {
        orderBy: { criado_em: 'desc' },
        take: 1
      },
      fichas: {
        orderBy: { criado_em: 'desc' },
        take: 1,
        include: {
          score_sst: true,
          rota: true
        }
      }
    },
  });

  if (!lead) {
    notFound();
  }

  const empresa = lead.empresa;
  const pedido = lead.pedidos[0];
  const ficha = lead.fichas[0];
  const scoreSst = ficha?.score_sst;
  const respostas = ficha?.respostas ? (ficha.respostas as Record<string, string>) : {};

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">Detalhes do Lead</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Informações gerais, diagnóstico e status comercial.</p>
          </div>
          <div className="flex gap-3 items-center">
            {ficha && (
              <Link
                href={`/api/relatorios/${ficha.id}?format=html`}
                target="_blank"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                📄 Visualizar Relatório SST
              </Link>
            )}
            <Actions empresaId={empresa?.id || ''} pedidoId={pedido?.id} />
          </div>
        </div>
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Razão Social</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{empresa?.razao_social || 'N/A'}</dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">CNPJ</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{empresa?.cnpj || 'N/A'}</dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Rota Designada</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {ficha?.rota?.rota || 'Pendente'}
                </span>
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Status de Pagamento</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  pedido?.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {pedido?.status || 'Nenhum pedido'}
                </span>
              </dd>
            </div>
            {scoreSst && (
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-900">Score SST</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <span className="font-bold text-gray-900">{scoreSst.total}</span> / 100 ({scoreSst.classificacao})
                </dd>
              </div>
            )}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Respostas do Diagnóstico</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <ul role="list" className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
                  {Object.entries(respostas).map(([pergunta, resposta]) => (
                    <li key={pergunta} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
                      <div className="flex w-0 flex-1 items-center">
                        <span className="truncate font-medium">{pergunta}</span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="text-gray-500">{resposta}</span>
                      </div>
                    </li>
                  ))}
                  {Object.keys(respostas).length === 0 && (
                    <li className="py-3 pl-3 pr-4 text-sm text-gray-500">Nenhuma resposta encontrada.</li>
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
