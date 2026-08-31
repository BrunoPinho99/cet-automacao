// Enums do domínio — espelham os valores do Prisma schema
// para uso seguro no frontend sem importar o Prisma Client

export enum Canal {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
}

export enum StatusFicha {
  INICIADA = 'iniciada',
  PARCIAL = 'parcial',
  CONCLUIDA = 'concluida',
  ABANDONADA = 'abandonada',
}

export enum TipoDocumento {
  PGR = 'PGR',
  PCMSO = 'PCMSO',
  LTCAT = 'LTCAT',
  LIP = 'LIP',
  AET = 'AET',
  PPP = 'PPP',
  OS = 'OS',
  TREINAMENTO = 'treinamento',
}

export enum PosseDocumento {
  SIM = 'sim',
  NAO = 'nao',
  NAO_SEI = 'nao_sei',
}

export enum Rota {
  A = 'A',
  B = 'B',
  C = 'C',
  CLIENTE_ATUAL = 'cliente_atual',
}

export enum StatusPedido {
  CRIADO = 'criado',
  AGUARDANDO = 'aguardando',
  PAGO = 'pago',
  FALHOU = 'falhou',
  ESTORNADO = 'estornado',
}

export enum ProdutoPedido {
  TRIAGEM = 'triagem',
  ESSENCIAL = 'essencial',
  COMPLETO = 'completo',
}

export enum Papel {
  COMERCIAL = 'comercial',
  FINANCEIRO = 'financeiro',
  TECNICO = 'tecnico',
  MEDICO = 'medico',
  ADMIN = 'admin',
}

export enum DirecaoMensagem {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
}

export enum ClassificacaoSST {
  CRITICO = 'critico',         // 0–30
  ALTO_RISCO = 'alto_risco',   // 31–60
  ATENCAO = 'atencao',         // 61–80
  REGULAR = 'regular',         // 81–100
}

export enum FaixaComercial {
  ALTA = 'alta',        // 70–100 → atendimento sênior imediato
  MEDIA = 'media',      // 45–69 → fila prioritária
  DIGITAL = 'digital',  // 0–44  → jornada digital
}

export enum StatusConformidade {
  CONFORME = 'conforme',               // 100%
  PARCIALMENTE_CONFORME = 'parcial',   // 50%
  NAO_CONFORME = 'nao_conforme',       // 0%
  NAO_COMPROVADO = 'nao_comprovado',   // 25% provisório
  NAO_APLICAVEL = 'nao_aplicavel',     // excluído do denominador
}

export enum StatusEvento {
  PENDENTE = 'pendente',
  PROCESSADO = 'processado',
  FALHOU = 'falhou',
  MORTO = 'morto', // dead-letter após máx. tentativas
}
