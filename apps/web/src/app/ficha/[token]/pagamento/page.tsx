import { notFound } from 'next/navigation';
import { prisma } from '@cet/db';
import { CheckoutButton } from './checkout-button';
import Link from 'next/link';
import { SstScoreGauge } from '@/components/sst-score-gauge';

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
  const scoreTotal = ficha.score_sst?.total || 28;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 mt-4 sm:mt-8 space-y-6">
      {isPago ? (
        <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950">Diagnóstico Pago e Liberado!</h2>
          <p className="text-sm text-emerald-800 max-w-md mx-auto">
            Seu relatório em PDF já foi gerado e está disponível para download. A equipe CET já registrou seu crédito integral de R$ 19,90!
          </p>
          <div className="pt-2">
            <Link
              href={`/portal/${token}`}
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-md"
            >
              Acessar Meu Relatório Completo
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <SstScoreGauge
            score={scoreTotal}
            empresaNome={ficha.lead.empresa?.razao_social || 'Sua Empresa'}
            cnpj={ficha.lead.empresa?.cnpj}
            checkoutUrl={checkoutUrl && !checkoutUrl.includes('pagamento_pendente') ? checkoutUrl : undefined}
          />

          {!checkoutUrl || checkoutUrl.includes('pagamento_pendente') ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <CheckoutButton fichaId={ficha.id} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
