import { prisma } from '@cet/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AtendimentoClient from './AtendimentoClient';

export const dynamic = 'force-dynamic';

export default async function AtendimentoPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  
  const usuarioLogadoId = session.userId || session.sub;

  const leads = await prisma.lead.findMany({
    where: {
      mensagens: {
        some: {} // Apenas leads com mensagens
      }
    },
    include: {
      contato: true,
      empresa: true,
      mensagens: {
        orderBy: { criado_em: 'asc' }
      }
    },
    orderBy: {
      atualizado_em: 'desc'
    }
  });

  // Serializa datas para passar de forma segura ao Client Component
  const serializableLeads = leads.map(lead => ({
    ...lead,
    mensagens: lead.mensagens.map(msg => ({
      ...msg,
      criado_em: msg.criado_em.toISOString(),
    }))
  }));

  return (
    <div className="w-full h-full">
      <AtendimentoClient leads={serializableLeads} usuarioLogadoId={usuarioLogadoId} />
    </div>
  );
}
