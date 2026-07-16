import { z } from "zod";

import { despesaCategorias } from "./despesas.types.js";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const despesaInputSchema = z.object({
  descricao: z.string().trim().min(2, "Descricao deve ter pelo menos 2 caracteres."),
  categoria: z.enum(despesaCategorias),
  fornecedor: optionalText,
  valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero."),
  vencimento: z.string().trim().min(1, "Vencimento e obrigatorio."),
  recorrente: z.boolean().optional(),
  pago: z.boolean().optional(),
});

export const despesaSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  categoria: z.enum(despesaCategorias).optional().or(z.literal("")).default(""),
  pago: z.enum(["true", "false"]).optional().or(z.literal("")).default(""),
});

export const despesaRecorrenciaSchema = z.object({
  meses: z.coerce.number().int().min(1).max(24),
});
