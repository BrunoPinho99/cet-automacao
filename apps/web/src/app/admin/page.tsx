import { prisma } from '@cet/db';
import Link from 'next/link';

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { criado_em: 'desc' },
    include: {
      empresa: true,
      pedidos: {
        orderBy: { criado_em: 'desc' },
        take: 1,
      },
      fichas: {
        orderBy: { criado_em: 'desc' },
        take: 1,
        include: {
          rota: true
        }
      }
    },
  });

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-semibold leading-6 text-gray-900">Leads e Clientes</h2>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos os leads cadastrados no sistema, status de pagamento e rota definida.
          </p>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Empresa</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">CNPJ</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rota</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Pagamento</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => {
                    const empresa = lead.empresa;
                    const pedido = lead.pedidos[0];
                    const ficha = lead.fichas[0];
                    const rota = ficha?.rota?.rota || '-';
                    const statusPagamento = pedido ? pedido.status : '-';

                    return (
                      <tr key={lead.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {empresa?.nome_fantasia || empresa?.razao_social || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {empresa?.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            rota === 'A' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                            rota === 'B' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                            rota === 'C' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                          }`}>
                            Rota {rota}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            statusPagamento === 'CONFIRMADO' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                            statusPagamento === 'PENDENTE' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                          }`}>
                            {statusPagamento}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:text-blue-900">
                            Detalhes<span className="sr-only">, {empresa?.nome_fantasia}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
