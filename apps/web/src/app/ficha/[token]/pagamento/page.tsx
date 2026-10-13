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

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200 mt-6 sm:mt-10">
      <div className="mb-6">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Triagem Concluída
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
          Diagnóstico Preliminar SST
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Olá, <strong>{ficha.lead.contato.nome}</strong>! Sua avaliação foi calculada com sucesso para a empresa{' '}
          <strong>{ficha.lead.empresa?.razao_social || 'sua empresa'}</strong>.
        </p>
      </div>

      {/* Cards de Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score SST de Conformidade</h2>
          <p className="text-3xl font-black text-emerald-600 mt-1">{ficha.score_sst?.total || 0} / 100</p>
          <p className="text-xs text-slate-500 mt-1">Classificação: <strong>{ficha.score_sst?.classificacao || 'N/A'}</strong></p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Potencial Comercial Avaliado</h2>
          <p className="text-3xl font-black text-blue-600 mt-1">{ficha.score_comercial?.total || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Faixa: <strong>{ficha.score_comercial?.faixa || 'N/A'}</strong></p>
        </div>
      </div>

      {isPago ? (
        <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl mx-auto shadow-sm">
            ✓
          </div>
          <h3 className="text-lg font-bold text-emerald-900">Diagnóstico Pago e Liberado!</h3>
          <p className="text-sm text-emerald-700 max-w-md mx-auto">
            Seu relatório em PDF já foi gerado e está disponível para download. A equipe CET já registrou seu crédito integral!
          </p>
          <div className="pt-2">
            <Link
              href={`/portal/${token}`}
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors"
            >
              Acessar Meu Relatório Completo
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {checkoutUrl && pedido?.status !== 'pago' && !checkoutUrl.includes('pagamento_pendente') ? (
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                <p className="text-amber-900 font-semibold text-sm">Você já possui uma fatura gerada para este diagnóstico.</p>
              </div>
              <Link 
                href={checkoutUrl}
                target="_blank"
                className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md"
              >
                Abrir Fatura PIX / Cartão no Asaas
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
