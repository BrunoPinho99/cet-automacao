/**
 * Utilitários de validação e formatação — funções puras, testáveis isoladamente.
 */

/** Remove tudo que não é dígito */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Valida CNPJ (14 dígitos + dígitos verificadores) */
export function validarCNPJ(cnpj: string): boolean {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) return false;
  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcDigito = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) {
      soma += parseInt(base[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcDigito(digitos, pesos1);
  if (d1 !== parseInt(digitos[12])) return false;

  const d2 = calcDigito(digitos, pesos2);
  return d2 === parseInt(digitos[13]);
}

/** Normaliza telefone para formato E.164 (+55...) */
export function normalizarTelefone(telefone: string): string {
  const digitos = somenteDigitos(telefone);

  // Se já começa com 55 e tem 12 ou 13 dígitos → E.164
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return `+${digitos}`;
  }

  // Se tem 10 ou 11 dígitos → adiciona +55
  if (digitos.length === 10 || digitos.length === 11) {
    return `+55${digitos}`;
  }

  // Retorna como veio (validação na camada acima)
  return `+${digitos}`;
}

/** Gera protocolo legível: CET-AAAA-XXXXXX */
export function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0');
  return `CET-${ano}-${seq}`;
}

/** Gera token de retomada seguro (UUID v4 já vem do Prisma, mas caso precise gerar no app) */
export function gerarTokenRetomada(): string {
  return crypto.randomUUID();
}
