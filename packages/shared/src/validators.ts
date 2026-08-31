import { z } from 'zod';

// --- CNPJ ---
// Normaliza para somente dígitos e valida módulo 11
function validarDigitoCnpj(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false; // todos iguais

  const calcDigito = (slice: string, peso: number[]): number => {
    const soma = slice.split('').reduce((acc, d, i) => {
      const p = peso[i];
      return acc + (p !== undefined ? parseInt(d) * p : 0);
    }, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcDigito(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== parseInt(nums[12] ?? '')) return false;

  const d2 = calcDigito(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d2 !== parseInt(nums[13] ?? '')) return false;

  return true;
}

export const CnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 14, { message: 'CNPJ deve ter 14 dígitos' })
  .refine(validarDigitoCnpj, { message: 'CNPJ inválido' });

// --- Telefone E.164 ---
// Aceita formatos BR e normaliza para +55XXXXXXXXXXX
export const TelefoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length >= 10 && v.length <= 13, { message: 'Telefone inválido' })
  .transform((v) => {
    // Se não começa com 55, assume Brasil
    if (!v.startsWith('55')) return `+55${v}`;
    return `+${v}`;
  });

// --- E-mail ---
export const EmailSchema = z.string().email({ message: 'E-mail inválido' }).toLowerCase();

// --- UUID ---
export const UuidSchema = z.string().uuid({ message: 'ID inválido' });

// --- Paginação ---
export const PaginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Schemas de entidade ---

export const EmpresaInputSchema = z.object({
  cnpj: CnpjSchema,
  razao_social: z.string().min(2).max(255).optional(),
  nome_fantasia: z.string().max(255).optional(),
  cnae_informado: z.string().max(10).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().length(2).toUpperCase().optional(),
  trabalhadores_proprios: z.coerce.number().int().min(0).default(0),
  trabalhadores_terceiros: z.coerce.number().int().min(0).default(0),
  unidades: z.coerce.number().int().min(1).default(1),
  estados_atendidos: z.array(z.string().length(2)).default([]),
  grau_risco: z.coerce.number().int().min(1).max(4).optional(),
});

export const ContatoInputSchema = z.object({
  empresa_id: UuidSchema.optional(),
  nome: z.string().min(2).max(255),
  cargo: z.string().max(100).optional(),
  telefone: TelefoneSchema,
  email: EmailSchema.optional(),
  canal_preferido: z.enum(['whatsapp', 'instagram', 'email']).default('whatsapp'),
});

export const FichaRespostasSchema = z.object({
  // Porte operacional
  trabalhadores_proprios: z.coerce.number().int().min(0).optional(),
  trabalhadores_terceiros: z.coerce.number().int().min(0).optional(),
  unidades: z.coerce.number().int().min(1).optional(),
  estados_atendidos: z.array(z.string().length(2)).optional(),
  cnae: z.string().max(10).optional(),
  grau_risco: z.coerce.number().int().min(1).max(4).optional(),

  // Urgência
  tem_acidente_recente: z.boolean().optional(),
  tem_fiscalizacao: z.boolean().optional(),
  prazo_urgente: z.boolean().optional(),

  // Objetivo
  objetivo_principal: z.string().max(500).optional(),

  // Documentos (preenchido via documento_declarado)
  documentos_confirmados: z.boolean().optional(),
}).passthrough(); // permite campos extras no jsonb

export const CheckoutInputSchema = z.object({
  lead_id: UuidSchema,
  produto: z.enum(['triagem', 'essencial', 'completo']),
});
