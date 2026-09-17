'use server';

import { prisma } from '@cet/db';
import { enviarMensagem } from '@/lib/mensageria';
import { revalidatePath } from 'next/cache';
import { registrarAuditoria } from '@/lib/auditoria';
import { randomUUID } from 'crypto';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getUsuarioLogado() {
  const token = cookies().get('cet_admin_session')?.value;
  if (!token) throw new Error('Não autenticado');
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) throw new Error('Token inválido');
  return payload.sub;
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
      template: template || undefined
    });
    revalidatePath('/admin/atendimento');
  } catch (error: unknown) {
    console.error('Erro ao enviar mensagem:', error);
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
