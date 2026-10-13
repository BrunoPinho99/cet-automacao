import { prisma } from '@cet/db';
import { LeadsManager, LeadItem } from './leads-manager';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const leadsRaw = await prisma.lead.findMany({
    orderBy: { criado_em: 'desc' },
    take: 100,
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
          rota: true,
        },
      },
    },
  });

  // Serializa datas para passar ao client component
  const leads: LeadItem[] = leadsRaw.map((lead) => ({
    id: lead.id,
    protocolo: lead.protocolo,
    canal: lead.canal,
    criado_em: lead.criado_em.toISOString(),
    empresa: lead.empresa
      ? {
          id: lead.empresa.id,
          cnpj: lead.empresa.cnpj,
          razao_social: lead.empresa.razao_social,
          nome_fantasia: lead.empresa.nome_fantasia,
          cidade: lead.empresa.cidade,
          uf: lead.empresa.uf,
          trabalhadores_proprios: lead.empresa.trabalhadores_proprios,
          trabalhadores_terceiros: lead.empresa.trabalhadores_terceiros,
          unidades: lead.empresa.unidades,
          grau_risco: lead.empresa.grau_risco,
        }
      : null,
    contato: lead.contato
      ? {
          id: lead.contato.id,
          nome: lead.contato.nome,
          telefone_e164: lead.contato.telefone_e164,
          email: lead.contato.email,
        }
      : null,
    pedidos: lead.pedidos.map((p) => ({
      id: p.id,
      status: p.status,
      valor_centavos: p.valor_centavos,
    })),
    fichas: lead.fichas.map((f) => ({
      id: f.id,
      status: f.status,
      rota: f.rota
        ? {
            id: f.rota.id,
            rota: f.rota.rota,
            sla_minutos: f.rota.sla_minutos,
          }
        : null,
    })),
  }));

  return <LeadsManager initialLeads={leads} />;
}
