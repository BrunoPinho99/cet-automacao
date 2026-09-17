export type Papel = 'comercial' | 'financeiro' | 'tecnico' | 'medico' | 'admin';

export type PermissaoRota = {
  pathPattern: RegExp;
  allowedRoles: Papel[];
};

export const ROTAS_PROTEGIDAS: PermissaoRota[] = [
  { pathPattern: /^\/api\/admin\/eventos\/.*/, allowedRoles: ['admin'] },
  { pathPattern: /^\/api\/admin\/relatorios\/.*/, allowedRoles: ['tecnico', 'admin'] },
  { pathPattern: /^\/api\/admin\/leads\/.*/, allowedRoles: ['comercial', 'tecnico', 'medico', 'admin'] },
  { pathPattern: /^\/api\/admin\/rotas\/.*/, allowedRoles: ['tecnico', 'medico', 'admin'] },
  { pathPattern: /^\/admin\/eventos\/.*/, allowedRoles: ['admin'] },
  { pathPattern: /^\/admin\/relatorios\/.*/, allowedRoles: ['tecnico', 'admin'] },
  { pathPattern: /^\/admin\/atendimento\/.*/, allowedRoles: ['comercial', 'tecnico', 'admin'] },
];

export function podeAcessarRota(path: string, papel: string): boolean {
  for (const regra of ROTAS_PROTEGIDAS) {
    if (regra.pathPattern.test(path)) {
      if (!regra.allowedRoles.includes(papel as Papel)) {
        return false;
      }
    }
  }
  return true; // Se não tem regra específica, mas passou no token, permite
}

export function podeLiberarDocumentoTecnico(papel: string): boolean {
  return ['tecnico', 'admin'].includes(papel);
}

export function podeLiberarConclusao(papel: string): boolean {
  return ['tecnico', 'admin'].includes(papel);
}
