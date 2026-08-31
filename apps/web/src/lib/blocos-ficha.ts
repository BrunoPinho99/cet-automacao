/**
 * Definição dos blocos da ficha progressiva.
 * Cada bloco contém campos com tipo, rótulo e validação.
 * A ficha avança bloco a bloco — o cliente pode sair e retomar a qualquer momento.
 */

export interface CampoFicha {
  id: string;
  tipo: 'texto' | 'numero' | 'select' | 'multi_select' | 'booleano' | 'data' | 'documento';
  rotulo: string;
  obrigatorio: boolean;
  opcoes?: string[];
  placeholder?: string;
  dica?: string;
}

export interface BlocoFicha {
  numero: number;
  titulo: string;
  descricao: string;
  campos: CampoFicha[];
}

export const BLOCOS_FICHA: BlocoFicha[] = [
  {
    numero: 1,
    titulo: 'Identificação da Empresa',
    descricao: 'Informações básicas da empresa para iniciarmos o diagnóstico.',
    campos: [
      { id: 'cnpj', tipo: 'texto', rotulo: 'CNPJ', obrigatorio: true, placeholder: '00.000.000/0000-00' },
      { id: 'razao_social', tipo: 'texto', rotulo: 'Razão Social', obrigatorio: true },
      { id: 'nome_fantasia', tipo: 'texto', rotulo: 'Nome Fantasia', obrigatorio: false },
      { id: 'atividade_real', tipo: 'texto', rotulo: 'Atividade Principal', obrigatorio: true, dica: 'Descreva a atividade principal da empresa' },
      { id: 'cidade', tipo: 'texto', rotulo: 'Cidade', obrigatorio: true },
      { id: 'uf', tipo: 'select', rotulo: 'Estado', obrigatorio: true, opcoes: ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] },
    ],
  },
  {
    numero: 2,
    titulo: 'Porte e Estrutura',
    descricao: 'Informações sobre o tamanho e abrangência da empresa.',
    campos: [
      { id: 'trabalhadores_proprios', tipo: 'numero', rotulo: 'Nº Trabalhadores Próprios', obrigatorio: true, placeholder: 'Ex: 50' },
      { id: 'trabalhadores_terceiros', tipo: 'numero', rotulo: 'Nº Trabalhadores Terceirizados', obrigatorio: true, placeholder: 'Ex: 10' },
      { id: 'unidades', tipo: 'numero', rotulo: 'Nº de Unidades/Filiais', obrigatorio: true, placeholder: 'Ex: 1' },
      { id: 'estados_atendidos', tipo: 'multi_select', rotulo: 'Estados com operação', obrigatorio: true, opcoes: ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] },
      { id: 'grau_risco', tipo: 'select', rotulo: 'Grau de Risco (se souber)', obrigatorio: false, opcoes: ['1','2','3','4','Não sei'], dica: 'Consulte o CNAE da empresa para identificar' },
    ],
  },
  {
    numero: 3,
    titulo: 'Situação de SST',
    descricao: 'Quais documentos de Saúde e Segurança do Trabalho a empresa possui?',
    campos: [
      { id: 'doc_pgr', tipo: 'select', rotulo: 'PGR (Programa de Gerenciamento de Riscos)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_pcmso', tipo: 'select', rotulo: 'PCMSO (Programa de Controle Médico)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_ltcat', tipo: 'select', rotulo: 'LTCAT (Laudo Técnico de Condições Ambientais)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_lip', tipo: 'select', rotulo: 'LIP (Laudo de Insalubridade e Periculosidade)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_aet', tipo: 'select', rotulo: 'AET (Análise Ergonômica do Trabalho)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_ppp', tipo: 'select', rotulo: 'PPP (Perfil Profissiográfico Previdenciário)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_os', tipo: 'select', rotulo: 'Ordens de Serviço (NR-1)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
      { id: 'doc_treinamentos', tipo: 'select', rotulo: 'Treinamentos (CIPA, NR-35, etc.)', obrigatorio: true, opcoes: ['Sim, vigente', 'Sim, vencido', 'Não possui', 'Não sei'] },
    ],
  },
  {
    numero: 4,
    titulo: 'Urgência e Contexto',
    descricao: 'Informações que ajudam a priorizar o atendimento.',
    campos: [
      { id: 'tem_acidente_recente', tipo: 'booleano', rotulo: 'Houve acidente de trabalho nos últimos 12 meses?', obrigatorio: true },
      { id: 'tem_fiscalizacao', tipo: 'booleano', rotulo: 'A empresa está sob fiscalização ou autuação?', obrigatorio: true },
      { id: 'prazo_urgente', tipo: 'booleano', rotulo: 'Existe prazo regulatório iminente (ex: eSocial)?', obrigatorio: true },
      { id: 'objetivo_principal', tipo: 'select', rotulo: 'Objetivo principal', obrigatorio: true, opcoes: ['Regularização completa', 'Atualizar documentação', 'Novo empreendimento', 'Responder fiscalização', 'Reduzir FAP/RAT', 'Outro'] },
      { id: 'observacoes', tipo: 'texto', rotulo: 'Observações adicionais', obrigatorio: false, placeholder: 'Alguma informação relevante que gostaria de compartilhar?' },
    ],
  },
  {
    numero: 5,
    titulo: 'Consentimento LGPD',
    descricao: 'Autorização para tratamento dos dados informados.',
    campos: [
      { id: 'consentimento_lgpd', tipo: 'booleano', rotulo: 'Concordo com o tratamento de dados conforme a Lei Geral de Proteção de Dados (LGPD) para fins de diagnóstico SST e proposta comercial pela CET — Clínica Especializada no Trabalho.', obrigatorio: true },
      { id: 'nome_responsavel', tipo: 'texto', rotulo: 'Nome do responsável pelo preenchimento', obrigatorio: true },
      { id: 'email', tipo: 'texto', rotulo: 'E-mail para recebimento do diagnóstico', obrigatorio: true, placeholder: 'nome@empresa.com.br' },
    ],
  },
];

export const TOTAL_BLOCOS = BLOCOS_FICHA.length;
