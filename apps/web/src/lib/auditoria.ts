import { prisma } from '@cet/db';

export interface RegistroAuditoria {
  entidade: string;
  entidade_id: string;
  acao: string;
  antes?: Record<string, unknown>;
  depois?: Record<string, unknown>;
  usuario_id?: string;
  ip?: string;
}

export async function registrarAuditoria(registro: RegistroAuditoria) {
  try {
    await prisma.auditoria.create({
      data: {
        entidade: registro.entidade,
        entidade_id: registro.entidade_id,
        acao: registro.acao,
        antes: registro.antes ? JSON.parse(JSON.stringify(registro.antes)) : undefined,
        depois: registro.depois ? JSON.parse(JSON.stringify(registro.depois)) : undefined,
        usuario_id: registro.usuario_id,
        ip: registro.ip,
      }
    });
  } catch (err) {
    console.error('[Auditoria] Erro ao registrar:', err);
  }
}
