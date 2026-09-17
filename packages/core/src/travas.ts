export type EstadoDocumentos = {
  todos_concluidos: boolean;
  faltam_assinaturas: boolean;
};

export type EstadoPagamento = {
  status: 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'isento';
};

export type EstadoFicha = {
  status: 'iniciada' | 'em_andamento' | 'concluida' | 'cancelada';
};

/**
 * Valida se os documentos finais podem ser liberados para produção/cliente.
 * Critério 5: Só libera se Ficha estiver concluída E pagamento aprovado (ou isento).
 */
export function podeLiberarProducao(
  ficha: EstadoFicha,
  pagamento: EstadoPagamento,
  documentos: EstadoDocumentos
): { permitido: boolean; motivos: string[] } {
  const motivos: string[] = [];

  if (ficha.status !== 'concluida') {
    motivos.push('A ficha de diagnóstico ainda não foi concluída.');
  }

  if (pagamento.status !== 'aprovado' && pagamento.status !== 'isento') {
    motivos.push('O pagamento não está aprovado ou isento.');
  }

  if (!documentos.todos_concluidos) {
    motivos.push('Nem todos os documentos necessários foram concluídos.');
  }

  if (documentos.faltam_assinaturas) {
    motivos.push('Faltam assinaturas obrigatórias nos documentos.');
  }

  return {
    permitido: motivos.length === 0,
    motivos,
  };
}
