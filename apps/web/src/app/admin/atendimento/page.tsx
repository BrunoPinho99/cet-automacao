import { prisma } from '@cet/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AtendimentoClient from './AtendimentoClient';

export default async function AtendimentoPage() {
  const token = cookies().get('cet_admin_session')?.value;
  if (!token) redirect('/login');
  
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) redirect('/login');
  
  const usuarioLogadoId = payload.sub;

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
