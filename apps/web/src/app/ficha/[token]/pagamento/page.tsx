import { notFound } from 'next/navigation';
import { prisma } from '@cet/db';
import { CheckoutButton } from './checkout-button';
import Link from 'next/link';

interface PagamentoPageProps {
  params: { token: string };
}

export default async function PagamentoPage({ params }: PagamentoPageProps) {
  const { token } = await params;

  // Carrega a ficha
  const ficha = await prisma.ficha.findUnique({
    where: { token_retomada: token },
    include: {
      lead: {
        include: { empresa: true, contato: true }
      },
      rota: true,
      score_sst: true,
      score_comercial: true,
    }
  });

  if (!ficha) {
    notFound();
  }

  // Verifica se o lead já tem um pedido no banco
  const pedido = await prisma.pedido.findFirst({
    where: { lead_id: ficha.lead_id },
    orderBy: { criado_em: 'desc' },
  });

  const isPago = pedido?.status === 'pago';
  const checkoutUrl = pedido?.checkout_url;
  
  // Define o valor para exibição simulada
  let valor = 'R$ 149,90';
  let plano = 'Diagnóstico Digital (Rota C)';
  
  if (ficha.rota?.rota === 'A' || ficha.rota?.rota === 'B') {
    valor = 'R$ 249,90';
    plano = ficha.rota?.rota === 'A' ? 'Plano Estratégico (Rota A)' : 'Plano Crescimento (Rota B)';
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100 mt-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resultado do Diagnóstico</h1>
        <p className="text-gray-600 mt-2">
          Olá, {ficha.lead.contato.nome}! A avaliação inicial foi concluída.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Score Comercial</h2>
          <p className="text-3xl font-bold text-blue-600 mt-1">{ficha.score_comercial?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Faixa: {ficha.score_comercial?.faixa || 'N/A'}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Score SST</h2>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{ficha.score_sst?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Classificação: {ficha.score_sst?.classificacao || 'N/A'}</p>
        </div>
      </div>

      <div className="p-6 bg-blue-50 text-blue-900 rounded-lg border border-blue-100 mb-8">
        <h2 className="text-lg font-bold mb-2">Sua Jornada: {plano}</h2>
        <p className="mb-4 text-blue-800">
          Com base nas suas respostas, preparamos um plano de adequação detalhado e mapeamento de riscos.
          O relatório completo e as orientações serão liberados após a confirmação da taxa de emissão.
        </p>
        <div className="flex justify-between items-center bg-white p-4 rounded-md border border-blue-200 shadow-sm">
          <span className="font-medium text-gray-700">Taxa de Emissão</span>
          <span className="text-2xl font-bold text-gray-900">{valor}</span>
        </div>
      </div>

      {isPago ? (
        <div className="p-6 bg-green-50 rounded-lg border border-green-200 text-center">
          <h3 className="text-lg font-bold text-green-800 mb-2">Pagamento Confirmado!</h3>
          <p className="text-green-700 mb-4">
            Agradecemos a confiança. O seu relatório já foi liberado e encaminhado para o seu WhatsApp/E-mail.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {checkoutUrl ? (
            <div className="w-full">
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-4 text-center">
                <p className="text-yellow-800 font-medium">Você já tem uma fatura em aberto.</p>
              </div>
              <Link 
                href={checkoutUrl}
                target="_blank"
                className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Acessar Fatura (PIX)
              </Link>
            </div>
          ) : (
            <CheckoutButton fichaId={ficha.id} />
          )}
        </div>
      )}
    </div>
  );
}
