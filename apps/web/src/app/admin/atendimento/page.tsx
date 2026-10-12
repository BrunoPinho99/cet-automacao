import { prisma } from '@cet/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AtendimentoClient from './AtendimentoClient';

export default async function AtendimentoPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  
  const usuarioLogadoId = session.userId || session.sub;

  const leads = await prisma.lead.findMany({
    where: {
      mensagens: {
        some: {} // Only leads that have messages
      }
    },
    include: {
      contato: true,
      mensagens: {
        orderBy: { criado_em: 'asc' }
      }
    },
    orderBy: {
      atualizado_em: 'desc'
    }
  });

  // Serialize dates for Client Component
  const serializableLeads = leads.map(lead => ({
    ...lead,
    mensagens: lead.mensagens.map(msg => ({
      ...msg,
      criado_em: msg.criado_em
    }))
  }));

  return (
    <div className="w-full h-full">
      <AtendimentoClient leads={serializableLeads} usuarioLogadoId={usuarioLogadoId} />
    </div>
  );
}
