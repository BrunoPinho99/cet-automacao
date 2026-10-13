'use server';

import { prisma } from '@cet/db';
import { enviarMensagem } from '@/lib/mensageria';
import { revalidatePath } from 'next/cache';
import { registrarAuditoria } from '@/lib/auditoria';
import { randomUUID } from 'crypto';

import { getSession } from '@/lib/auth';

async function getUsuarioLogado() {
  const session = await getSession();
  if (!session) throw new Error('Não autenticado');
  return session.userId || session.sub;
}

export async function assumirAtendimento(leadId: string) {
  const usuarioId = await getUsuarioLogado();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  
  if (!lead) throw new Error('Lead não encontrado');
  
  await prisma.lead.update({
    where: { id: leadId },
    data: { atendente_id: usuarioId }
  });

  await registrarAuditoria({
    entidade: 'Lead',
    entidade_id: leadId,
    acao: 'assumir_atendimento',
    antes: { atendente_id: lead.atendente_id },
    depois: { atendente_id: usuarioId },
    usuario_id: usuarioId,
  });

  revalidatePath('/admin/atendimento');
}

export async function devolverParaRobo(leadId: string) {
  const usuarioId = await getUsuarioLogado();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  
  if (!lead) throw new Error('Lead não encontrado');

  await prisma.lead.update({
    where: { id: leadId },
    data: { atendente_id: null }
  });

  await registrarAuditoria({
    entidade: 'Lead',
    entidade_id: leadId,
    acao: 'devolver_robo',
    antes: { atendente_id: lead.atendente_id },
    depois: { atendente_id: null },
    usuario_id: usuarioId,
  });

  revalidatePath('/admin/atendimento');
}

export async function enviarMensagemManual(formData: FormData) {
  const leadId = formData.get('leadId') as string;
  const conteudo = formData.get('conteudo') as string;
  const template = formData.get('template') as string | null;

  if (!leadId || !conteudo) return;

  const chave_idempotencia = randomUUID();

  try {
    await enviarMensagem({
      lead_id: leadId,
      conteudo,
      chave_idempotencia,
      template: template || undefined,
      ignorarJanela24h: true,
    });
    revalidatePath('/admin/atendimento');
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao enviar mensagem:', error);
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export async function limparDadosDemoAction() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Apenas administradores podem executar esta ação.');
  }

  // Deletar dados na ordem correta de chaves estrangeiras
  await prisma.mensagem.deleteMany({});
  await prisma.relatorio.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.rota.deleteMany({});
  await prisma.scoreSST.deleteMany({});
  await prisma.scoreComercial.deleteMany({});
  await prisma.documentoDeclarado.deleteMany({});
  await prisma.arquivo.deleteMany({});
  await prisma.ficha.deleteMany({});
  await prisma.negocio.deleteMany({});
  await prisma.consentimento.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contato.deleteMany({});
  await prisma.empresa.deleteMany({});
  
  await prisma.domainEvent.deleteMany({
    where: {
      payload: {
        path: ['origem'],
        equals: 'seed_demo'
      }
    }
  }).catch(() => {});

  revalidatePath('/admin/atendimento');
  revalidatePath('/admin');
  revalidatePath('/admin/paineis');

  return { success: true, message: 'Dados de demonstração removidos com sucesso. O sistema está 100% real.' };
}

export async function excluirMensagemAction(mensagemId: string) {
  await getUsuarioLogado();
  await prisma.mensagem.delete({
    where: { id: mensagemId },
  });
  revalidatePath('/admin/atendimento');
  return { success: true };
}

export async function limparMensagensDoLeadAction(leadId: string) {
  await getUsuarioLogado();
  await prisma.mensagem.deleteMany({
    where: { lead_id: leadId },
  });
  revalidatePath('/admin/atendimento');
  return { success: true };
}

